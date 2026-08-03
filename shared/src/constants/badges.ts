import { ExportType } from '../types/exportTypes.js';
import { Badge, BADGES } from '../types/badge.js';
import { EXPORT_TYPES } from './exportTypes.js';

/**
 * Feature limits per badge (tier). Each tier includes the previous tier’s capabilities.
 * Observer: PNG/JPEG/PDF export, advanced styling, high-res export, forced watermark, project cap.
 * Explorer+: adds SVG, watermark-free export, time-series import/timeline, GIF/MP4 animation
 * export, and the AI data parser/generator (with a per-tier daily quota).
 * Chronographer: adds public embed (iframe + public page) and a higher AI daily quota.
 */
export type BadgeDetails = {
  price: number; // Monthly price in USD (0 for free)
  limits: {
    maxExportQuality: number;
    /** Allowed export formats (still + animated, by tier). */
    allowedExportFormats: readonly ExportType[];
    /** Whether picture/export quality is limited (Observer only). */
    pictureQualityLimit: boolean;
    /** Max projects count (Observer = 5; paid = unlimited). */
    maxProjectsCount: number | null;
    /** Max simultaneous active sessions per account (null = unlimited). */
    maxConcurrentSessions: number | null;
    /** Advanced map/legend styling (all tiers). */
    advancedStylesEnabled: boolean;
    /** Time-series import & timeline (Explorer+). */
    historicalDataImport: boolean;
    /** Animated timeline export (Explorer+). */
    animationExport: boolean;
    /** Formats allowed for animation export (Explorer+: GIF, MP4). */
    allowedAnimationFormats: readonly ExportType[];
    /** Chronographer: public embed URL / iframe for a project map. */
    publicEmbed: boolean;
    /** High-resolution export tiers (2K, 4K) enabled (all tiers). */
    highResolutionExport: boolean;
    /** AI data parser and generator (Explorer+). */
    aiParser: boolean;
    /** Daily cap on AI parser/generator requests (Observer: 0, Explorer: 5, Chronographer: 10). */
    aiParseRequestsPerDay: number;
    /** Watermark-free image/animation export (Explorer+). Deliberately decoupled from
     * advancedStylesEnabled — Observer has advanced styling but keeps the forced watermark. */
    watermarkFree: boolean;
  };
};

export const BADGE_DETAILS: Record<Badge, BadgeDetails> = {
  [BADGES.observer]: {
    price: 0,
    limits: {
      maxExportQuality: 100,
      allowedExportFormats: [EXPORT_TYPES.png, EXPORT_TYPES.jpeg, EXPORT_TYPES.pdf],
      allowedAnimationFormats: [],
      pictureQualityLimit: false,
      maxProjectsCount: 5,
      maxConcurrentSessions: 5,
      advancedStylesEnabled: true,
      historicalDataImport: false,
      animationExport: false,
      publicEmbed: false,
      highResolutionExport: true,
      aiParser: false,
      aiParseRequestsPerDay: 0,
      watermarkFree: false,
    },
  },
  [BADGES.explorer]: {
    price: 49,
    limits: {
      maxExportQuality: 100,
      allowedExportFormats: [
        EXPORT_TYPES.png,
        EXPORT_TYPES.svg,
        EXPORT_TYPES.jpeg,
        EXPORT_TYPES.gif,
        EXPORT_TYPES.mp4,
        EXPORT_TYPES.pdf,
      ],
      allowedAnimationFormats: [EXPORT_TYPES.gif, EXPORT_TYPES.mp4],
      pictureQualityLimit: false,
      maxProjectsCount: null,
      maxConcurrentSessions: 5,
      advancedStylesEnabled: true,
      historicalDataImport: true,
      animationExport: true,
      publicEmbed: false,
      highResolutionExport: true,
      aiParser: true,
      aiParseRequestsPerDay: 5,
      watermarkFree: true,
    },
  },
  [BADGES.chronographer]: {
    price: 149,
    limits: {
      maxExportQuality: 100,
      allowedExportFormats: [
        EXPORT_TYPES.png,
        EXPORT_TYPES.svg,
        EXPORT_TYPES.jpeg,
        EXPORT_TYPES.gif,
        EXPORT_TYPES.mp4,
        EXPORT_TYPES.pdf,
      ],
      allowedAnimationFormats: [EXPORT_TYPES.gif, EXPORT_TYPES.mp4],
      pictureQualityLimit: false,
      maxProjectsCount: null,
      maxConcurrentSessions: 5,
      advancedStylesEnabled: true,
      historicalDataImport: true,
      animationExport: true,
      publicEmbed: true,
      highResolutionExport: true,
      aiParser: true,
      aiParseRequestsPerDay: 10,
      watermarkFree: true,
    },
  },
};
