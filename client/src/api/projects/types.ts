import type { DataSet, RegionData } from '@/store/mapData/types';
import type { ImportDataType } from '@/types/mapData';

export type ProjectDataset = {
  allIds: string[];
  byId: Record<string, RegionData>;
  /** Optional for legacy API payloads missing this field. */
  importDataType?: ImportDataType;
  /** Present when data was imported from Google Sheets. */
  google?: {
    url: string;
    gid: string | null;
  } | null;
  /**
   * Historical / animated map periods. Omitted on legacy saves and when Google Sheets
   * is linked (rows are re-fetched client-side).
   */
  timelineData?: Record<string, DataSet>;
  timePeriods?: string[];
  activeTimePeriod?: string | null;
};

export type ProjectMapStyles = {
  border: { show: boolean; color: string; width: number };
  shadow: {
    show: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  zoomControls: { show: boolean; position: { x: number; y: number } };
  /** Saved map camera state (viewport). Omitted in legacy payloads. */
  viewport?: { zoom: number; pan: { x: number; y: number } };
  picture: { transparentBackground: boolean; backgroundColor: string; showWatermark?: boolean };
  regionLabels: {
    show: boolean;
    color: string;
    fontSize: number;
    labelPositionsByRegionId?: Record<string, { x: number; y: number }>;
  };
  /** Offset of draggable time period pill from default top-center; omitted on legacy saves. */
  timePeriodLabelOffset?: { x: number; y: number };
};

export type ProjectLegendStyles = {
  labels: { color: string; fontSize: number };
  title: { show: boolean; text: string; color?: string; fontSize?: number };
  position: string;
  floatingPosition: { x: number; y: number };
  floatingSize: { width: number; height: number | 'auto' };
  /**
   * Map visualization frame size (px) when the project was saved; used to scale
   * {@link floatingPosition} on embed when the iframe/viewport differs. Omitted on legacy saves.
   */
  floatingMapFrameSize?: { width: number; height: number } | null;
  /** @since client: omitted on legacy projects = opaque background */
  transparentBackground?: boolean;
  backgroundColor: string;
  noDataColor: string;
};

export type ProjectLegendData = {
  items: Array<{
    id: string;
    name: string;
    min: number;
    max: number;
    color: string;
  }>;
};

/** SEO fields for the public embed page. */
export type ProjectEmbedSeo = {
  title: string | null;
  description: string | null;
  keywords: string[] | null;
  allowedOrigins: string[] | null;
};

/** Public embed settings for a saved project (API shape). */
export type ProjectEmbed = {
  enabled: boolean;
  token: string | null;
  showHeader: boolean;
  seo: ProjectEmbedSeo;
};

export type Project = {
  id: string;
  name: string;
  countryId: string | null;
  dataset: ProjectDataset | null;
  mapStyles: ProjectMapStyles | null;
  legendStyles: ProjectLegendStyles | null;
  legendData: ProjectLegendData | null;
  embed: ProjectEmbed;
  /** When true, the project cannot be saved, renamed, re-embedded or deleted. */
  locked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectEmbedUpdatePayload = {
  enabled: boolean;
  showHeader?: boolean;
  seo?: {
    title?: string | null;
    description?: string | null;
    keywords?: string[] | null;
    allowedOrigins?: string[] | null;
  };
};

export type ProjectEmbedUpdateResponse = {
  embed: ProjectEmbed;
};

export type ProjectLockUpdatePayload = {
  locked: boolean;
};

export type ProjectCreatePayload = {
  name: string;
  countryId?: string | null;
  dataset?: ProjectDataset | null;
  mapStyles?: ProjectMapStyles | null;
  legendStyles?: ProjectLegendStyles | null;
  legendData?: ProjectLegendData | null;
};

export type ProjectUpdatePayload = Partial<ProjectCreatePayload>;
