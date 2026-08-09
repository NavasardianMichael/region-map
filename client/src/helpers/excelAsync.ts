/**
 * Excel read/write via dynamic import so `xlsx` is not in the Visualizer initial chunk.
 * TIME_COLUMN_PATTERN must stay aligned with importDataParsers.ts.
 */
import type { MissingColumnsError } from '@/helpers/importDataParsers';

const TIME_COLUMN_PATTERN = /^(year|time|period|date|month|quarter|season|epoch|era)$/i;

function importXlsxPackage() {
  return import('xlsx');
}

type XlsxModule = Awaited<ReturnType<typeof importXlsxPackage>>;

let xlsxModulePromise: Promise<XlsxModule> | null = null;

function loadXlsx(): Promise<XlsxModule> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = importXlsxPackage();
  }
  return xlsxModulePromise;
}

export type ExcelParsedRow = { id: string; label: string; value: number; timePeriod?: string };

export async function parseExcelBuffer(
  buffer: ArrayBuffer,
): Promise<ExcelParsedRow[] | MissingColumnsError> {
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

  if (jsonData.length > 0) {
    const keys = Object.keys(jsonData[0]);
    const missing: string[] = [];
    if (!keys.some((k) => k.toLowerCase() === 'id')) missing.push('id');
    if (!keys.some((k) => /^(label|region|name|area|province|state|country)/i.test(k)))
      missing.push('label');
    if (!keys.some((k) => /^(value|count|amount|number|data|total|population)/i.test(k)))
      missing.push('value');
    if (missing.length > 0) return { error: 'missing_columns', missing };
  }

  const data: ExcelParsedRow[] = [];

  for (const row of jsonData) {
    const keys = Object.keys(row);

    const idKey = keys.find((key) => key.toLowerCase() === 'id');
    const labelKey = keys.find((key) =>
      /^(label|region|name|area|province|state|country)/i.test(String(key)),
    );
    const valueKey = keys.find((key) =>
      /^(value|count|amount|number|data|total|population)/i.test(String(key)),
    );
    const timeKey = keys.find((key) => TIME_COLUMN_PATTERN.test(String(key)));

    const id = idKey ? String(row[idKey] ?? '').trim() : undefined;
    const label = String(row[labelKey ?? keys[idKey ? 1 : 0]] ?? '').trim();
    const value = parseFloat(String(row[valueKey ?? keys[idKey ? 2 : 1]] ?? ''));
    const timePeriod = timeKey ? String(row[timeKey] ?? '') : undefined;

    if (id && label && !isNaN(value)) {
      data.push({ id, label, value, timePeriod: timePeriod || undefined });
    }
  }

  return data;
}

export async function writeRowsToXlsxFile(
  filename: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  const XLSX = await loadXlsx();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, filename);
}
