import { useVisualizerStore } from '@/store/mapData/store';
import type { DataSet } from '@/store/mapData/types';
import { convertToRegionData, type ParsedRow, sortTimePeriods } from '@/helpers/importDataParsers';
import { aggregateDuplicateRows, type DuplicateStrategy } from '@/helpers/importDuplicates';

export type CommitParsedImportOutcome =
  | { ok: true; variant: 'timeline'; rowCount: number; periodCount: number }
  | {
      ok: true;
      variant: 'static';
      rowCount: number;
      sideEffect: 'none' | 'info_time_on_observer' | 'warn_no_time_chronographer';
    }
  | { ok: false; reason: 'empty' };

/**
 * Applies parsed import rows to map data stores (same rules as file / sheet import).
 * Does not show toasts — caller handles UX feedback.
 */
export function commitParsedImport(
  parsed: ParsedRow[],
  svgTitles: string[],
  historicalDataImportAllowed: boolean,
  duplicateStrategy?: DuplicateStrategy,
): CommitParsedImportOutcome {
  if (parsed.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  const rows = duplicateStrategy ? aggregateDuplicateRows(parsed, duplicateStrategy) : parsed;
  const hasTimePeriods = rows.some((row) => row.timePeriod !== undefined);
  const { setTimelineData, setVisualizerState, clearTimelineData } = useVisualizerStore.getState();

  if (hasTimePeriods && historicalDataImportAllowed) {
    const grouped: Record<string, ParsedRow[]> = {};

    for (const row of rows) {
      const period = String(row.timePeriod ?? 'Unknown');
      if (!grouped[period]) grouped[period] = [];
      grouped[period].push(row);
    }

    const periodOrder = sortTimePeriods(Object.keys(grouped));
    const timeline: Record<string, DataSet> = {};
    for (const period of periodOrder) {
      timeline[period] = convertToRegionData(grouped[period], svgTitles);
    }

    setTimelineData(timeline, periodOrder);
    return {
      ok: true,
      variant: 'timeline',
      rowCount: rows.length,
      periodCount: periodOrder.length,
    };
  }

  let sideEffect: 'none' | 'info_time_on_observer' | 'warn_no_time_chronographer' = 'none';
  if (hasTimePeriods && !historicalDataImportAllowed) {
    sideEffect = 'info_time_on_observer';
  } else if (historicalDataImportAllowed && !hasTimePeriods) {
    sideEffect = 'warn_no_time_chronographer';
  }

  const regionData = convertToRegionData(rows, svgTitles);
  clearTimelineData();
  setVisualizerState({ data: regionData });
  return { ok: true, variant: 'static', rowCount: rows.length, sideEffect };
}
