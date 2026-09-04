/**
 * Quality check run on a parsed import before it is applied to the map.
 *
 * Two things can go wrong silently: the parser skips rows whose id or value it cannot read,
 * and region names that match no map region get written to the dataset anyway, where they
 * render as nothing. Both mean data the user expected to see is missing, so they are surfaced
 * and the AI parser is offered as a second attempt.
 */
import { resolveCountryCode } from '@/helpers/countryAliases';
import { type ParsedRow } from '@/helpers/importDataParsers';
import { mapDataToSvgRegions } from '@/helpers/textSimilarity';

export type ImportIssues = {
  /** Rows the parser could not read at all. */
  skippedRowCount: number;
  /** Rows the parser did read. */
  parsedRowCount: number;
  /** Distinct region names that match no region of the current map. */
  unmatchedRegions: string[];
  /** Distinct region names in the import. */
  distinctRegionCount: number;
};

/** Region names listed in the prompt before it falls back to a count. */
export const UNMATCHED_SAMPLE_LIMIT = 6;

/**
 * Share of rows or regions that must fail before the user is interrupted. One stray row in a
 * large export is normal and already covered by the import toast; a systematic mismatch is not.
 */
const ISSUE_RATIO_THRESHOLD = 0.1;

/**
 * Region names that would not land on the map.
 *
 * Checks distinct names, not rows: `mapDataToSvgRegions` lets each region be claimed once per
 * call, so passing every row of a timeline would exhaust the claims and report later periods
 * as unmatched. The app maps one period at a time for the same reason.
 */
export const findUnmatchedRegions = (rows: ParsedRow[], svgTitles: string[]): string[] => {
  if (svgTitles.length === 0) return [];

  const distinctIds = [...new Set(rows.map((row) => row.id))];
  const probes = distinctIds.map((id) => ({ id, label: id, value: 0 }));
  const mapped = mapDataToSvgRegions(probes, svgTitles, resolveCountryCode);

  return distinctIds.filter((_, index) => !mapped[index]?.matched);
};

export const findImportIssues = ({
  rows,
  skippedRowCount,
  svgTitles,
}: {
  rows: ParsedRow[];
  skippedRowCount: number;
  svgTitles: string[];
}): ImportIssues => {
  const unmatchedRegions = findUnmatchedRegions(rows, svgTitles);

  return {
    skippedRowCount,
    parsedRowCount: rows.length,
    unmatchedRegions,
    distinctRegionCount: new Set(rows.map((row) => row.id)).size,
  };
};

/** True when the import lost enough data to be worth a second attempt through the AI parser. */
export const hasSignificantIssues = ({
  skippedRowCount,
  parsedRowCount,
  unmatchedRegions,
  distinctRegionCount,
}: ImportIssues): boolean => {
  const totalRows = parsedRowCount + skippedRowCount;
  if (totalRows === 0) return false;
  if (parsedRowCount === 0) return true;

  const skippedRatio = skippedRowCount / totalRows;
  const unmatchedRatio =
    distinctRegionCount === 0 ? 0 : unmatchedRegions.length / distinctRegionCount;

  return skippedRatio > ISSUE_RATIO_THRESHOLD || unmatchedRatio > ISSUE_RATIO_THRESHOLD;
};
