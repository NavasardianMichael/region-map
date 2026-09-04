/**
 * Excel read/write via dynamic import so `xlsx` is not in the Visualizer initial chunk.
 * Column detection is shared with the CSV path via `importColumnResolver`.
 */
import {
  type ImportColumnRoles,
  type MissingColumnsError,
  resolveImportColumns,
} from '@/helpers/importColumnResolver';

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

/** Rows read from the sheet plus how many were unreadable, matching the CSV parser's shape. */
export type ExcelParsedImport = { rows: ExcelParsedRow[]; skippedRowCount: number };

const toCellText = (cell: unknown): string =>
  cell === null || cell === undefined ? '' : String(cell).trim();

const readRowsByRoles = (rows: string[][], roles: ImportColumnRoles): ExcelParsedImport => {
  const data: ExcelParsedRow[] = [];
  let skippedRowCount = 0;

  for (const cells of rows) {
    const id = cells[roles.idIndex];
    const value = Number(cells[roles.valueIndex]);
    if (!id || !Number.isFinite(value)) {
      skippedRowCount++;
      continue;
    }

    const label = cells[roles.labelIndex] || id;
    const timePeriod = roles.timeIndex === null ? undefined : cells[roles.timeIndex];

    data.push({ id, label, value, timePeriod: timePeriod || undefined });
  }

  return { rows: data, skippedRowCount };
};

export async function parseExcelBuffer(
  buffer: ArrayBuffer,
  { svgTitles }: { svgTitles?: string[] } = {},
): Promise<ExcelParsedImport | MissingColumnsError> {
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const sheetRows = XLSX.utils
    .sheet_to_json<unknown[]>(firstSheet, { header: 1, blankrows: false })
    .map((row) => row.map(toCellText));

  if (sheetRows.length === 0) return { rows: [], skippedRowCount: 0 };

  const [headers, ...rows] = sheetRows;
  const resolution = resolveImportColumns({ headers, sampleRows: rows, svgTitles });
  if ('error' in resolution) return resolution;

  return readRowsByRoles(rows, resolution);
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
