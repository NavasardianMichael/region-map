/**
 * Parsers and helpers for import data (CSV, Excel, JSON).
 * Used by ImportDataPanel to normalize user data into region format.
 */
import type { RegionData } from '@/store/mapData/types';
import type { ImportDataType } from '@/types/mapData';
import { mapDataToSvgRegions } from '@/helpers/textSimilarity';

/** Parsed row from user data (id, label, value, optional timePeriod). */
export type ParsedRow = { id: string; label: string; value: number; timePeriod?: string };

export const TIME_COLUMN_PATTERN = /^(year|time|period|date|month|quarter|season|epoch|era)$/i;

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

export const hasTimeColumn = (header: string): boolean => {
  const parts = header.split(/[,;\t]/).map((s) => s.trim());
  return parts.some((p) => TIME_COLUMN_PATTERN.test(p));
};

export const getTimeColumnIndex = (header: string): number => {
  const parts = header.split(/[,;\t]/).map((s) => s.trim());
  return parts.findIndex((p) => TIME_COLUMN_PATTERN.test(p));
};

export const hasIdColumn = (header: string): boolean => {
  const parts = header.split(/[,;\t]/).map((s) => s.trim().toLowerCase());
  return parts.some((p) => p === 'id');
};

export const hasLabelColumn = (header: string): boolean => {
  const parts = header.split(/[,;\t]/).map((s) => s.trim());
  return parts.some((p) => /^(label|region|name|area|province|state|country)/i.test(p));
};

export const hasValueColumn = (header: string): boolean => {
  const parts = header.split(/[,;\t]/).map((s) => s.trim());
  return parts.some((p) => /^(value|count|amount|number|data|total|population)/i.test(p));
};

export type MissingColumnsError = { error: 'missing_columns'; missing: string[] };

export type ParseCSVResult = ParsedRow[] | MissingColumnsError;

/** Strip UTF-8 BOM so headers like `id` parse after re-importing exported CSVs (export adds BOM for Excel). */
const stripUtf8Bom = (s: string): string => s.replace(/^\uFEFF/, '');

export const parseCSV = (content: string): ParseCSVResult => {
  const lines = stripUtf8Bom(content).trim().split('\n');
  const data: ParsedRow[] = [];

  const headerLine = lines[0] || '';
  const hasId = hasIdColumn(headerLine);
  const hasTime = hasTimeColumn(headerLine);
  const timeIdx = hasTime ? getTimeColumnIndex(headerLine) : -1;
  const isHeader = /^(id|label|region|name)/i.test(headerLine) || hasTime;
  const startIndex = isHeader ? 1 : 0;

  if (isHeader && lines.length > 1) {
    const missing: string[] = [];
    if (!hasId) missing.push('id');
    if (!hasLabelColumn(headerLine)) missing.push('label');
    if (!hasValueColumn(headerLine)) missing.push('value');
    if (missing.length > 0) {
      return { error: 'missing_columns', missing };
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    let parts: string[];

    if (line.includes('"')) {
      parts = line.match(/(?:[^,"]|"(?:\\.|[^"])*")+/g) || [];
      parts = parts.map((s) => s.replace(/^"|"$/g, '').trim());
    } else {
      parts = line.split(/[,;\t]/).map((s) => s.trim());
    }

    const timePeriod = hasTime && timeIdx >= 0 ? parts[timeIdx] : undefined;
    const filteredParts =
      hasTime && timeIdx >= 0 ? parts.filter((_, idx) => idx !== timeIdx) : parts;

    if (hasId) {
      const [id, label, valueStr] = filteredParts;
      const value = parseFloat(valueStr);
      const idTrimmed = id?.trim();
      if (idTrimmed && label && !isNaN(value)) {
        data.push({
          id: idTrimmed,
          label,
          value,
          timePeriod: timePeriod || undefined,
        });
      }
    }
  }

  return data;
};

export { parseExcelBuffer as parseExcel } from '@/helpers/excelAsync';

export const parseJSON = (content: string): ParsedRow[] => {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => {
          const hasId = item.id != null && String(item.id).trim() !== '';
          const hasLabel = item.label || item.region || item.name;
          const hasValue = typeof item.value === 'number' || typeof item.count === 'number';
          return hasId && hasLabel && hasValue;
        })
        .map((item) => {
          const rawTime = item.year ?? item.time ?? item.period ?? item.date ?? item.month;
          return {
            id: String(item.id).trim(),
            label: String(item.label ?? item.region ?? item.name ?? '').trim(),
            value: Number(item.value ?? item.count ?? 0),
            timePeriod: rawTime !== undefined && rawTime !== null ? String(rawTime) : undefined,
          };
        });
    }
    return [];
  } catch {
    return [];
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
  const mappedData = mapDataToSvgRegions(parsed, svgTitles);

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
