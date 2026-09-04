/**
 * Token vocabularies and thresholds for fuzzy import-column resolution.
 * Consumed by `helpers/importColumnResolver.ts` (CSV, Excel, tab-delimited and AI imports).
 */

/**
 * Splits header text into comparable tokens, breaking on punctuation, camelCase and the
 * letter/digit boundary: `TIME_PERIOD` / `time-period` / `timePeriod` -> ['time','period'],
 * and `Population2020` -> ['population','2020'].
 */
export const HEADER_TOKEN_SPLIT_REGEX =
  /(?<=[a-z0-9])(?=[A-Z])|(?<=[a-zA-Z])(?=[0-9])|[^a-zA-Z0-9]+/;

/** Tokens identifying the period column used for animated (historical) maps. */
export const TIME_COLUMN_TOKENS = [
  'year',
  'yr',
  'time',
  'period',
  'date',
  'month',
  'quarter',
  'season',
  'epoch',
  'era',
] as const;

/** Tokens identifying the numeric measure column rendered on the map. */
export const VALUE_COLUMN_TOKENS = [
  'value',
  // Not bare `obs`: it would make dimension columns such as `OBS_STATUS` score as the measure.
  // `OBS_VALUE` already matches on its `value` token.
  'observation',
  'count',
  'amount',
  'number',
  'num',
  'data',
  'total',
  'population',
  'rate',
  'ratio',
  'score',
  'quantity',
  'qty',
  'index',
] as const;

/** Tokens identifying the column that names a sub-national region. */
export const REGION_COLUMN_TOKENS = [
  'id',
  'code',
  'ref',
  'region',
  'name',
  'label',
  'area',
  'state',
  'province',
  'district',
  'territory',
  'county',
  'municipality',
  'prefecture',
  'canton',
  'oblast',
  'department',
  'division',
  'zone',
  'subdivision',
] as const;

/** Tokens marking a column that holds a human-readable region name rather than a code. */
export const LABEL_COLUMN_TOKENS = ['label', 'name'] as const;

/**
 * Tokens for the country/nation of a dataset. The country is chosen from the app's own
 * "Select country" dropdown, so these columns must never win region identification.
 */
export const COUNTRY_COLUMN_TOKENS = ['country', 'nation', 'countries'] as const;

/** Rows examined below the first line to decide whether that line is a header. */
export const HEADER_DETECTION_SAMPLE_ROWS = 6;

/** Rows sampled from the top of a file to judge what a column actually contains. */
export const COLUMN_SAMPLE_ROW_COUNT = 200;

/** Minimum share of sampled cells that must parse as finite numbers for a value column. */
export const VALUE_NUMERIC_RATIO_THRESHOLD = 0.6;

/** Minimum share of sampled cells that must match a map region for evidence-based id detection. */
export const REGION_MATCH_RATIO_THRESHOLD = 0.5;

/**
 * Minimum Levenshtein similarity for a header token to count as a synonym hit. Deliberately
 * loose: the cell-evidence gates (numeric ratio, period shape, region match) reject the
 * columns a permissive header match lets through, so a near miss costs far more than a
 * false positive here.
 */
export const HEADER_TOKEN_SIMILARITY_THRESHOLD = 0.75;

/** Score for a token that is a prefix of a synonym, or vice versa (`Pop` / `population`). */
export const HEADER_PREFIX_MATCH_SCORE = 0.85;

/** Shortest token treated as an abbreviation of a longer synonym, so `a` cannot match `area`. */
export const MIN_ABBREVIATION_TOKEN_LENGTH = 3;

/** Shortest synonym treated as the stem of a longer token, so `Identifier` still matches `id`. */
export const MIN_VOCABULARY_STEM_LENGTH = 2;

/** Matches a plausible period cell: a bare year, or a year-leading date/quarter such as `2023-Q1`. */
export const PERIOD_VALUE_REGEX =
  /^\s*(1[0-9]{3}|2[0-9]{3})([-/\s].*)?$|^\s*\d{4}-\d{2}(-\d{2})?\s*$/;
