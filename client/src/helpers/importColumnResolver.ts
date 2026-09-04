/**
 * Header-driven column resolution for imported datasets.
 *
 * Import files from statistical agencies (OECD, Eurostat, national bureaus) carry dozens of
 * dimension columns the map does not need. Rather than assuming a fixed column order, this
 * resolver identifies the region, value and period columns from the header row and from what
 * the cells actually contain, so every other column can be ignored.
 *
 * The country is chosen from the app's own country dropdown, so country columns are never
 * candidates for region identification.
 */
import {
  COLUMN_SAMPLE_ROW_COUNT,
  COUNTRY_COLUMN_TOKENS,
  HEADER_PREFIX_MATCH_SCORE,
  HEADER_TOKEN_SIMILARITY_THRESHOLD,
  HEADER_TOKEN_SPLIT_REGEX,
  LABEL_COLUMN_TOKENS,
  MIN_ABBREVIATION_TOKEN_LENGTH,
  MIN_VOCABULARY_STEM_LENGTH,
  PERIOD_VALUE_REGEX,
  REGION_COLUMN_TOKENS,
  REGION_MATCH_RATIO_THRESHOLD,
  TIME_COLUMN_TOKENS,
  VALUE_COLUMN_TOKENS,
  VALUE_NUMERIC_RATIO_THRESHOLD,
} from '@/constants/importColumns';
import { buildMapCountryCodeIndex, resolveCountryCode } from '@/helpers/countryAliases';
import { calculateSimilarity, normalizeText } from '@/helpers/textSimilarity';

/** Column indexes the importer reads; every other column in the file is ignored. */
export type ImportColumnRoles = {
  idIndex: number;
  labelIndex: number;
  valueIndex: number;
  timeIndex: number | null;
};

export type MissingColumnsError = { error: 'missing_columns'; missing: string[] };

export type ColumnResolution = ImportColumnRoles | MissingColumnsError;

type ResolveInput = {
  headers: string[];
  /** Data rows (header excluded) used as evidence for what each column holds. */
  sampleRows: string[][];
  /** Region titles of the currently selected map, when available. */
  svgTitles?: string[];
};

const tokenizeHeader = (header: string): string[] =>
  header
    .split(HEADER_TOKEN_SPLIT_REGEX)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

/**
 * Score one header token against one synonym, in descending order of confidence:
 * exact match, then prefix in either direction (`Identifier`/`id`, `Pop`/`population`),
 * then Levenshtein similarity for spelling drift (`Populacion`/`population`).
 */
const scoreTokenAgainstWord = (token: string, word: string): number => {
  if (token === word) return 1;

  const isStemOfToken = word.length >= MIN_VOCABULARY_STEM_LENGTH && token.startsWith(word);
  const isAbbreviationOfWord =
    token.length >= MIN_ABBREVIATION_TOKEN_LENGTH && word.startsWith(token);
  if (isStemOfToken || isAbbreviationOfWord) return HEADER_PREFIX_MATCH_SCORE;

  const similarity = calculateSimilarity(token, word);
  return similarity >= HEADER_TOKEN_SIMILARITY_THRESHOLD ? similarity : 0;
};

/** Score a header against a synonym vocabulary, taking the strongest hit across its tokens. */
const scoreHeaderTokens = (header: string, vocabulary: readonly string[]): number => {
  const tokens = tokenizeHeader(header);
  if (tokens.length === 0) return 0;

  let best = 0;
  for (const token of tokens) {
    for (const word of vocabulary) {
      const score = scoreTokenAgainstWord(token, word);
      if (score === 1) return 1;
      if (score > best) best = score;
    }
  }
  return best;
};

const hasExactToken = (header: string, vocabulary: readonly string[]): boolean => {
  const tokens = tokenizeHeader(header);
  return tokens.some((token) => vocabulary.some((word) => word === token));
};

const columnCells = (sampleRows: string[][], index: number): string[] => {
  const cells: string[] = [];
  for (const row of sampleRows) {
    const cell = row[index];
    if (cell !== undefined && cell !== '') cells.push(cell);
  }
  return cells;
};

/** Share of non-empty sampled cells that parse as finite numbers. */
const numericRatio = (sampleRows: string[][], index: number): number => {
  const cells = columnCells(sampleRows, index);
  if (cells.length === 0) return 0;
  const numeric = cells.filter((cell) => Number.isFinite(Number(cell))).length;
  return numeric / cells.length;
};

const periodRatio = (sampleRows: string[][], index: number): number => {
  const cells = columnCells(sampleRows, index);
  if (cells.length === 0) return 0;
  const periods = cells.filter((cell) => PERIOD_VALUE_REGEX.test(cell)).length;
  return periods / cells.length;
};

/**
 * Share of a column's distinct values that name a region of the selected map.
 *
 * Matches by normalized equality, then — for group maps, whose regions are countries — by ISO
 * country code, so `USA` / `United States of America` / `840` all count against a `United
 * States` title. Both passes are O(1) per cell; the fuzzy pass in `mapDataToSvgRegions` still
 * runs later and catches the rest.
 */
const regionMatchRatio = (
  sampleRows: string[][],
  index: number,
  normalizedTitles: Set<string>,
  mapCountryCodes: Map<string, string>,
): number => {
  if (normalizedTitles.size === 0) return 0;
  const distinct = new Set(columnCells(sampleRows, index));
  if (distinct.size === 0) return 0;

  let matched = 0;
  for (const cell of distinct) {
    if (normalizedTitles.has(normalizeText(cell))) {
      matched++;
      continue;
    }
    if (mapCountryCodes.size === 0) continue;
    const code = resolveCountryCode(cell);
    if (code !== null && mapCountryCodes.has(code)) matched++;
  }
  return matched / distinct.size;
};

type ColumnProfile = {
  index: number;
  header: string;
  timeScore: number;
  valueScore: number;
  regionScore: number;
  isCountry: boolean;
  numeric: number;
  period: number;
  regionEvidence: number;
};

const buildProfiles = (
  headers: string[],
  sampleRows: string[][],
  normalizedTitles: Set<string>,
  mapCountryCodes: Map<string, string>,
): ColumnProfile[] =>
  headers.map((header, index) => ({
    index,
    header,
    timeScore: scoreHeaderTokens(header, TIME_COLUMN_TOKENS),
    valueScore: scoreHeaderTokens(header, VALUE_COLUMN_TOKENS),
    regionScore: scoreHeaderTokens(header, REGION_COLUMN_TOKENS),
    isCountry: hasExactToken(header, COUNTRY_COLUMN_TOKENS),
    numeric: numericRatio(sampleRows, index),
    period: periodRatio(sampleRows, index),
    regionEvidence: regionMatchRatio(sampleRows, index, normalizedTitles, mapCountryCodes),
  }));

const pickBest = (
  items: ColumnProfile[],
  score: (item: ColumnProfile) => number,
): number | null => {
  let bestIndex: number | null = null;
  let bestScore = 0;
  for (const item of items) {
    const value = score(item);
    if (value > bestScore) {
      bestScore = value;
      bestIndex = item.index;
    }
  }
  return bestIndex;
};

/** Period column: a header synonym hit whose cells also look like periods. */
const resolveTimeIndex = (profiles: ColumnProfile[]): number | null =>
  pickBest(
    profiles.filter((profile) => profile.timeScore > 0 && profile.period > 0.5),
    (profile) => profile.timeScore + profile.period,
  );

/**
 * Region column. Evidence wins over naming: an OECD file offers both `REF_AREA` (`US46`) and
 * `Reference area` (`South Dakota`), and only the latter matches the map.
 *
 * A country column is a normal candidate here, because on a group map the regions *are*
 * countries. It is only deprioritized in the header-only fallback below, where there is no
 * map to check it against and it is more likely to be a dataset-wide constant.
 */
const resolveIdIndex = (profiles: ColumnProfile[], excluded: Set<number>): number | null => {
  const eligible = profiles.filter((profile) => !excluded.has(profile.index));

  const byEvidence = pickBest(
    eligible.filter((profile) => profile.regionEvidence >= REGION_MATCH_RATIO_THRESHOLD),
    (profile) => profile.regionEvidence,
  );
  if (byEvidence !== null) return byEvidence;

  const named = eligible.filter((profile) => profile.regionScore > 0 && profile.numeric < 1);
  const byHeader = pickBest(
    named.filter((profile) => !profile.isCountry),
    (profile) => profile.regionScore,
  );
  if (byHeader !== null) return byHeader;

  return pickBest(named, (profile) => profile.regionScore);
};

/**
 * Value column: a numeric column, preferring one whose header names a measure.
 *
 * A named column only has to be partly numeric — real datasets carry gaps and `N/A` markers,
 * and those rows are dropped later. An unnamed column must clear the ratio threshold before it
 * is trusted, so dimension codes are never mistaken for the measure.
 */
const resolveValueIndex = (profiles: ColumnProfile[], excluded: Set<number>): number | null => {
  const eligible = profiles.filter((profile) => !excluded.has(profile.index));

  const named = pickBest(
    eligible.filter((profile) => profile.valueScore > 0 && profile.numeric > 0),
    (profile) => profile.valueScore + profile.numeric,
  );
  if (named !== null) return named;

  return pickBest(
    eligible.filter((profile) => profile.numeric >= VALUE_NUMERIC_RATIO_THRESHOLD),
    (profile) => profile.numeric,
  );
};

/**
 * Label column: an explicit `label`/`name` header, otherwise the region column itself, so a
 * machine code column such as `REF_AREA` is never shown to the user as a region name.
 * `Country Name` qualifies on a group map, where that column holds the region's display name.
 */
const resolveLabelIndex = (profiles: ColumnProfile[], idIndex: number): number => {
  const explicit = profiles.find(
    (profile) => profile.index !== idIndex && hasExactToken(profile.header, LABEL_COLUMN_TOKENS),
  );
  return explicit ? explicit.index : idIndex;
};

export const resolveImportColumns = ({
  headers,
  sampleRows,
  svgTitles = [],
}: ResolveInput): ColumnResolution => {
  const normalizedTitles = new Set(svgTitles.map(normalizeText));
  const mapCountryCodes = buildMapCountryCodeIndex(svgTitles);
  const profiles = buildProfiles(
    headers,
    sampleRows.slice(0, COLUMN_SAMPLE_ROW_COUNT),
    normalizedTitles,
    mapCountryCodes,
  );

  const timeIndex = resolveTimeIndex(profiles);
  const excluded = new Set<number>(timeIndex === null ? [] : [timeIndex]);

  const idIndex = resolveIdIndex(profiles, excluded);
  if (idIndex !== null) excluded.add(idIndex);

  const valueIndex = resolveValueIndex(profiles, excluded);

  const missing: string[] = [];
  if (idIndex === null) missing.push('id');
  if (valueIndex === null) missing.push('value');
  if (idIndex === null || valueIndex === null) return { error: 'missing_columns', missing };

  return {
    idIndex,
    labelIndex: resolveLabelIndex(profiles, idIndex),
    valueIndex,
    timeIndex,
  };
};

/**
 * True when the first line names columns rather than holding data.
 *
 * A data row always carries a number in its value column, so a first row with no numeric cell
 * sitting above rows that do have one is a header — whatever language it is written in. That
 * shape test comes first because the synonym check below only sees Latin-script headers, and
 * it also settles cases a synonym hit cannot: region names legitimately contain vocabulary
 * words ("Moscow Oblast", "Cape Town Metro").
 */
export const looksLikeHeaderRow = (cells: string[], remainingRows: string[][] = []): boolean => {
  const filled = cells.filter((cell) => cell !== '');
  if (filled.length === 0) return false;

  const hasNumber = (row: string[]): boolean =>
    row.some((cell) => cell !== '' && Number.isFinite(Number(cell)));

  if (hasNumber(filled)) return false;
  if (remainingRows.some(hasNumber)) return true;

  return filled.some(
    (cell) =>
      scoreHeaderTokens(cell, REGION_COLUMN_TOKENS) > 0 ||
      scoreHeaderTokens(cell, VALUE_COLUMN_TOKENS) > 0 ||
      scoreHeaderTokens(cell, TIME_COLUMN_TOKENS) > 0,
  );
};
