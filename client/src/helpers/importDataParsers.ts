/**
 * Parsers and helpers for import data (CSV, Excel, JSON).
 * Used by ImportDataPanel to normalize user data into region format.
 */
import type { RegionData } from '@/store/mapData/types';
import type { ImportDataType } from '@/types/mapData';
import { HEADER_DETECTION_SAMPLE_ROWS } from '@/constants/importColumns';
import { resolveCountryCode } from '@/helpers/countryAliases';
import {
  type ColumnResolution,
  type ImportColumnRoles,
  looksLikeHeaderRow,
  type MissingColumnsError,
  resolveImportColumns,
} from '@/helpers/importColumnResolver';
import { mapDataToSvgRegions } from '@/helpers/textSimilarity';

/** Parsed row from user data (id, label, value, optional timePeriod). */
export type ParsedRow = { id: string; label: string; value: number; timePeriod?: string };

export type { MissingColumnsError };

/** Options shared by the text-based parsers; map titles let column detection use real evidence. */
export type ParseOptions = { svgTitles?: string[] };

/** Order of import format tabs in the visualizer; labels come from `visualizer.importData.format.*` in locales. */
export const IMPORT_FORMAT_ORDER: ImportDataType[] = [
  'csv',
  'excel',
  'json',
  'sheets',
  'table',
  'tab_delimited',
  'ai_parser',
];

/** Rows read from a file plus how many were unreadable, so callers can warn about data loss. */
export type ParsedImport = { rows: ParsedRow[]; skippedRowCount: number };

export type ParseCSVResult = ParsedImport | MissingColumnsError;

/** Strip UTF-8 BOM so headers like `id` parse after re-importing exported CSVs (export adds BOM for Excel). */
const stripUtf8Bom = (s: string): string => s.replace(/^\uFEFF/, '');

/** Split one delimited line, honouring double-quoted fields that may contain the delimiter. */
export const splitDelimitedLine = (line: string): string[] => {
  if (!line.includes('"')) {
    return line.split(/[,;\t]/).map((cell) => cell.trim());
  }

  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (char === ',' || char === ';' || char === '\t')) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());

  return cells;
};

/** Split into lines tolerating CRLF and stray blank lines from spreadsheet exports. */
const toLines = (content: string): string[] =>
  stripUtf8Bom(content)
    .split(/\r?\n/)
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim() !== '');

/** Read rows using resolved column indexes, ignoring every other column in the file. */
const readRowsByRoles = (rows: string[][], roles: ImportColumnRoles): ParsedImport => {
  const data: ParsedRow[] = [];
  let skippedRowCount = 0;

  for (const cells of rows) {
    const id = cells[roles.idIndex]?.trim();
    const value = Number(cells[roles.valueIndex]);
    if (!id || !Number.isFinite(value)) {
      skippedRowCount++;
      continue;
    }

    const label = cells[roles.labelIndex]?.trim() || id;
    const timePeriod = roles.timeIndex === null ? undefined : cells[roles.timeIndex]?.trim();

    data.push({ id, label, value, timePeriod: timePeriod || undefined });
  }

  return { rows: data, skippedRowCount };
};

export const parseCSV = (content: string, { svgTitles }: ParseOptions = {}): ParseCSVResult => {
  const lines = toLines(content);
  if (lines.length === 0) return { rows: [], skippedRowCount: 0 };

  const allRows = lines.map(splitDelimitedLine);
  const firstRow = allRows[0];
  const isHeader = looksLikeHeaderRow(firstRow, allRows.slice(1, HEADER_DETECTION_SAMPLE_ROWS));
  const rows = isHeader ? allRows.slice(1) : allRows;

  // Without a header there is nothing to resolve against, so fall back to the documented
  // `id,label,value` ordering that the sample file and manual entry produce. If that yields
  // nothing the file is unrecognizable — report the missing columns rather than an empty result,
  // so the user is told what the first row needs instead of a generic "invalid values" warning.
  if (!isHeader) {
    const positional = readRowsByRoles(rows, {
      idIndex: 0,
      labelIndex: 1,
      valueIndex: 2,
      timeIndex: null,
    });
    if (positional.rows.length === 0) return { error: 'missing_columns', missing: ['id', 'value'] };
    return positional;
  }

  const resolution: ColumnResolution = resolveImportColumns({
    headers: firstRow,
    sampleRows: rows,
    svgTitles,
  });
  if ('error' in resolution) return resolution;

  return readRowsByRoles(rows, resolution);
};

/** Chronological when every period is numeric, otherwise natural order, so animations play forward. */
export const sortTimePeriods = (periods: string[]): string[] => {
  const allNumeric = periods.every((period) => Number.isFinite(Number(period)));
  if (allNumeric) {
    return [...periods].sort((a, b) => Number(a) - Number(b));
  }
  return [...periods].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

export { parseExcelBuffer as parseExcel } from '@/helpers/excelAsync';

export const parseJSON = (content: string): ParsedImport => {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const usable = parsed.filter((item) => {
        const hasId = item.id != null && String(item.id).trim() !== '';
        const hasLabel = item.label || item.region || item.name;
        const hasValue = typeof item.value === 'number' || typeof item.count === 'number';
        return hasId && hasLabel && hasValue;
      });

      const rows = usable.map((item) => {
        const rawTime = item.year ?? item.time ?? item.period ?? item.date ?? item.month;
        return {
          id: String(item.id).trim(),
          label: String(item.label ?? item.region ?? item.name ?? '').trim(),
          value: Number(item.value ?? item.count ?? 0),
          timePeriod: rawTime !== undefined && rawTime !== null ? String(rawTime) : undefined,
        };
      });

      return { rows, skippedRowCount: parsed.length - rows.length };
    }
    return { rows: [], skippedRowCount: 0 };
  } catch {
    return { rows: [], skippedRowCount: 0 };
  }
};

/**
 * Convert parsed data to RegionData format with similarity matching.
 * Uses SVG titles to match user labels to region IDs.
 */
export const convertToRegionData = (
  parsed: ParsedRow[],
  svgTitles: string[],
): { allIds: string[]; byId: Record<string, RegionData> } => {
  // Country codes let group maps (World, continents) match `Russian Federation` to `Russia`
  // and `USA` to `United States`; on sub-national maps no title resolves, so the pass is inert.
  const mappedData = mapDataToSvgRegions(parsed, svgTitles, resolveCountryCode);

  const allIds = [...new Set(mappedData.map((item) => item.id))];
  const byId = Object.fromEntries(
    mappedData.map((item) => [item.id, { id: item.id, label: item.label, value: item.value }]),
  );

  return { allIds, byId };
};

/**
 * Sanitize project name for use in filename.
 * Removes invalid characters and limits length.
 */
export const sanitizeFilename = (name: string): string => {
  const invalidChars = /[<>:"/\\|?*]/g;
  // eslint-disable-next-line no-control-regex
  const controlChars = /[\u0000-\u001f]/g;
  return (
    name
      .replace(invalidChars, '')
      .replace(controlChars, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100)
      .trim() || 'data'
  );
};
