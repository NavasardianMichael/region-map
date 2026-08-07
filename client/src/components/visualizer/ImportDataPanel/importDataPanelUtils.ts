import type { MessageInstance } from 'antd/es/message/interface';
import type { DataSet } from '@/store/mapData/types';

export const SUCCESS_MESSAGE_DURATION = 5;
export const FEEDBACK_MESSAGE_DURATION = 5;

/**
 * When at least one stored region id exists on the loaded map SVG, keep the current
 * dataset (e.g. project just loaded). Otherwise sample data would overwrite saved imports.
 *
 * Deliberately `.some()`, not `.every()` — real imports routinely have regions that
 * didn't match anything on the map (unmatched names, territories with no data, etc.),
 * which is normal partial coverage, not a sign that this data belongs to a different
 * map. Requiring every id to match meant a single unmatched region made this function
 * return false on every load, so the sample-data generator below would silently
 * overwrite the rest of a real, saved import with random placeholder values.
 */
export function storeDataMatchesMapTitles(
  titles: string[],
  data: DataSet,
  timePeriods: string[],
  timelineData: Record<string, DataSet>,
): boolean {
  if (titles.length === 0) return false;
  const titleSet = new Set(titles);
  if (timePeriods.length > 0) {
    return timePeriods.some((p) => {
      const ds = timelineData[p];
      return ds != null && ds.allIds.some((id) => titleSet.has(id));
    });
  }
  if (data.allIds.length === 0) return false;
  return data.allIds.some((id) => titleSet.has(id));
}

/** All feedback types auto-hide after 5s; the close control allows early dismissal. */
export function showMessageWithClose(
  messageApi: MessageInstance,
  type: 'success' | 'info' | 'warning' | 'error',
  content: string,
): void {
  const duration = type === 'success' ? SUCCESS_MESSAGE_DURATION : FEEDBACK_MESSAGE_DURATION;
  messageApi[type]({ content, duration });
}

/** Generate sample value within legend ranges (0-100, 101-500, 501-1000) for region at index. */
export const generateSampleValue = (regionIndex: number): number => {
  const ranges = [
    { min: 10, max: 100 },
    { min: 101, max: 500 },
    { min: 501, max: 1000 },
  ];
  const range = ranges[regionIndex % ranges.length];
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
};
