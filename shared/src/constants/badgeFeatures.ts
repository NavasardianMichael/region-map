import { EXPORT_TYPES } from './exportTypes.js';
import { BADGE_DETAILS } from './badges.js';
import type { Badge } from '../types/badge.js';
import type { ExportType } from '../types/exportTypes.js';

/**
 * Keys of the localized rows shown on the billing card and in the "badge purchased" email.
 * Keep these in sync with `badges.rows.*` in the client i18n locales.
 */
export const BADGE_FEATURE_ROW_KEYS = {
  projectsLimited: 'projectsLimited',
  projectsUnlimited: 'projectsUnlimited',
  sessionsLimited: 'sessionsLimited',
  imageExport: 'imageExport',
  advancedStyles: 'advancedStyles',
  noWatermark: 'noWatermark',
  highResolutionExport: 'highResolutionExport',
  timeSeries: 'timeSeries',
  animationExport: 'animationExport',
  embedMapIframe: 'embedMapIframe',
  publicMapPage: 'publicMapPage',
  aiParser: 'aiParser',
} as const;

export type BadgeFeatureRowKey =
  (typeof BADGE_FEATURE_ROW_KEYS)[keyof typeof BADGE_FEATURE_ROW_KEYS];

export type BadgeFeatureRowParams = {
  count?: number;
  formats?: string;
  quality?: number;
};

export type BadgeFeatureRow = {
  key: BadgeFeatureRowKey;
  params?: BadgeFeatureRowParams;
  included: boolean;
};

/**
 * Fixed display order for the export line: JPEG → PNG → PDF → SVG (each only if the tier allows it).
 * GIF/MP4 stay on the animation row, not this one.
 */
export const EXPORT_FORMAT_DISPLAY_ORDER: ReadonlyArray<{ type: ExportType; label: string }> = [
  { type: EXPORT_TYPES.jpeg, label: 'JPEG' },
  { type: EXPORT_TYPES.png, label: 'PNG' },
  { type: EXPORT_TYPES.pdf, label: 'PDF' },
  { type: EXPORT_TYPES.svg, label: 'SVG' },
];

export function formatListedBadgeExportFormats(badge: Badge): string {
  const allowed = new Set(BADGE_DETAILS[badge].limits.allowedExportFormats);
  return EXPORT_FORMAT_DISPLAY_ORDER.filter(({ type }) => allowed.has(type))
    .map(({ label }) => label)
    .join(', ');
}

/**
 * Structured feature rows for a badge, in display order. Rows are returned with `included`
 * flags so consumers can either filter (email, paid tiers) or render both included/excluded
 * states (future use). Consumers translate `key` + `params` via their own localization.
 */
export function buildBadgeFeatureRows(badge: Badge): BadgeFeatureRow[] {
  const l = BADGE_DETAILS[badge].limits;

  const projectRow: BadgeFeatureRow =
    l.maxProjectsCount === null
      ? { key: BADGE_FEATURE_ROW_KEYS.projectsUnlimited, included: true }
      : {
          key: BADGE_FEATURE_ROW_KEYS.projectsLimited,
          params: { count: l.maxProjectsCount },
          included: true,
        };

  const sessionsRow: BadgeFeatureRow | null =
    l.maxConcurrentSessions === null
      ? null
      : {
          key: BADGE_FEATURE_ROW_KEYS.sessionsLimited,
          params: { count: l.maxConcurrentSessions },
          included: true,
        };

  const imageExportRow: BadgeFeatureRow = {
    key: BADGE_FEATURE_ROW_KEYS.imageExport,
    params: {
      formats: formatListedBadgeExportFormats(badge),
      quality: l.maxExportQuality,
    },
    included: true,
  };

  const rows: Array<BadgeFeatureRow | null> = [
    projectRow,
    sessionsRow,
    imageExportRow,
    { key: BADGE_FEATURE_ROW_KEYS.advancedStyles, included: l.advancedStylesEnabled },
    // "No watermark" is a paid-tier benefit, decoupled from advancedStylesEnabled since
    // Observer has advanced styling but must keep the forced watermark; observer's watermark
    // limitation is conveyed via the tier description, not as a checkmarked row.
    { key: BADGE_FEATURE_ROW_KEYS.noWatermark, included: l.watermarkFree },
    { key: BADGE_FEATURE_ROW_KEYS.highResolutionExport, included: l.highResolutionExport },
    { key: BADGE_FEATURE_ROW_KEYS.timeSeries, included: l.historicalDataImport },
    { key: BADGE_FEATURE_ROW_KEYS.animationExport, included: l.animationExport },
    { key: BADGE_FEATURE_ROW_KEYS.embedMapIframe, included: l.publicEmbed },
    { key: BADGE_FEATURE_ROW_KEYS.publicMapPage, included: l.publicEmbed },
    {
      key: BADGE_FEATURE_ROW_KEYS.aiParser,
      params: { count: l.aiParseRequestsPerDay },
      included: l.aiParser,
    },
  ];

  return rows.filter((row): row is BadgeFeatureRow => row !== null);
}
