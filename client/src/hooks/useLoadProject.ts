import { useCallback } from 'react';
import type { Project } from '@/api/projects/types';
import { useLegendDataStore } from '@/store/legendData/store';
import { useLegendStylesStore } from '@/store/legendStyles/store';
import { useVisualizerStore } from '@/store/mapData/store';
import type { DataSet, RegionData } from '@/store/mapData/types';
import { useMapStylesStore } from '@/store/mapStyles/store';
import { useProjectsStore } from '@/store/projects/store';
import { captureStateSnapshot } from '@/hooks/useProjectState';
import type { CountryId } from '@/types/mapData';
import { IMPORT_DATA_TYPES } from '@/constants/data';
import { DEFAULT_MAP_PICTURE, DEFAULT_MAP_VIEWPORT } from '@/constants/mapStyles';
import { readGoogleFromDataset } from '@/helpers/readGoogleFromDataset';

type LegacyRegionRow = RegionData & { hiddenFromChart?: boolean };

function migrateDatasetById(byId: Record<string, RegionData>): Record<string, RegionData> {
  return Object.fromEntries(
    Object.entries(byId).map(([id, r]) => {
      const row = r as LegacyRegionRow;
      if (row.hiddenFromChart === true && row.hidden !== true) {
        const { hiddenFromChart: _, ...rest } = row;
        return [id, { ...rest, hidden: true } satisfies RegionData];
      }
      return [id, r];
    }),
  );
}

function migrateDataSet(ds: DataSet): DataSet {
  return {
    allIds: ds.allIds,
    byId: migrateDatasetById(ds.byId),
  };
}

function migrateTimelineData(timelineData: Record<string, DataSet>): Record<string, DataSet> {
  return Object.fromEntries(
    Object.entries(timelineData).map(([period, ds]) => [period, migrateDataSet(ds)]),
  );
}

export type LoadProjectOptions = {
  /**
   * When false, skips setting current project id and saved snapshot (e.g. public embed view).
   * Default true.
   */
  associateWithProjectsStore?: boolean;
};

/**
 * Returns a callback that loads a project's data into all stores.
 */
export function useLoadProject(): (project: Project, options?: LoadProjectOptions) => void {
  return useCallback((project: Project, options?: LoadProjectOptions) => {
    const { setVisualizerState, clearTimelineData } = useVisualizerStore.getState();
    clearTimelineData();
    const { setMapStylesState } = useMapStylesStore.getState();
    const { setLegendStylesState } = useLegendStylesStore.getState();
    const { setItems } = useLegendDataStore.getState();
    const { setCurrentProjectId, setSavedStateSnapshot } = useProjectsStore.getState();

    const importDataType = project.dataset?.importDataType ?? IMPORT_DATA_TYPES.csv;
    const google = readGoogleFromDataset(project.dataset ?? null);
    const isSheetsSync = importDataType === IMPORT_DATA_TYPES.sheets && Boolean(google.url);

    const emptyData: DataSet = { allIds: [], byId: {} };
    const flatData = isSheetsSync
      ? emptyData
      : project.dataset
        ? migrateDataSet({ allIds: project.dataset.allIds, byId: project.dataset.byId })
        : emptyData;

    const savedPeriods = project.dataset?.timePeriods;
    const savedTimeline = project.dataset?.timelineData;
    const hasTimeline =
      !isSheetsSync &&
      Array.isArray(savedPeriods) &&
      savedPeriods.length > 0 &&
      savedTimeline != null &&
      Object.keys(savedTimeline).length > 0;

    let timelineData: Record<string, DataSet> = {};
    let timePeriods: string[] = [];
    let activeTimePeriod: string | null = null;
    let data = flatData;

    if (hasTimeline) {
      timelineData = migrateTimelineData(savedTimeline);
      timePeriods = savedPeriods;
      const savedActive = project.dataset?.activeTimePeriod ?? null;
      activeTimePeriod =
        savedActive && timelineData[savedActive] ? savedActive : (timePeriods[0] ?? null);
      if (activeTimePeriod && timelineData[activeTimePeriod]) {
        data = timelineData[activeTimePeriod];
      }
    }

    // Load country + dataset (Google Sheets: rows come only from /sheets/fetch, not stored JSON)
    setVisualizerState({
      selectedCountryId: (project.countryId as CountryId) ?? null,
      importDataType,
      data,
      google,
      isGoogleSheetSyncLoading: false,
      timelineData,
      timePeriods,
      activeTimePeriod,
    });

    // Load map styles (merge with current defaults for safety)
    if (project.mapStyles) {
      const legacyPositions =
        (project.mapStyles as { regionLabelPositions?: Record<string, { x: number; y: number }> })
          .regionLabelPositions ?? {};
      setMapStylesState({
        border: project.mapStyles.border,
        shadow: project.mapStyles.shadow,
        zoomControls: project.mapStyles.zoomControls,
        viewport: project.mapStyles.viewport ?? DEFAULT_MAP_VIEWPORT,
        picture: {
          ...DEFAULT_MAP_PICTURE,
          ...project.mapStyles.picture,
          backgroundColor:
            project.mapStyles.picture.backgroundColor || DEFAULT_MAP_PICTURE.backgroundColor,
          showWatermark: project.mapStyles.picture.showWatermark ?? false,
        },
        regionLabels: {
          ...project.mapStyles.regionLabels,
          labelPositionsByRegionId:
            project.mapStyles.regionLabels.labelPositionsByRegionId ?? legacyPositions,
        },
        timePeriodLabelOffset: project.mapStyles.timePeriodLabelOffset ?? { x: 0, y: 0 },
      });
    }

    // Load legend styles
    if (project.legendStyles) {
      setLegendStylesState({
        labels: project.legendStyles.labels,
        title: {
          color: '#18294D',
          fontSize: 12,
          ...project.legendStyles.title,
        },
        position: project.legendStyles.position as ReturnType<
          typeof useLegendStylesStore.getState
        >['position'],
        floatingPosition: project.legendStyles.floatingPosition,
        floatingSize: project.legendStyles.floatingSize,
        floatingMapFrameSize: project.legendStyles.floatingMapFrameSize ?? null,
        transparentBackground: project.legendStyles.transparentBackground ?? false,
        backgroundColor: project.legendStyles.backgroundColor,
        noDataColor: project.legendStyles.noDataColor,
      });
    }

    // Load legend data
    if (project.legendData?.items) {
      setItems(project.legendData.items);
    }

    if (options?.associateWithProjectsStore !== false) {
      setCurrentProjectId(project.id);
      requestAnimationFrame(() => {
        setSavedStateSnapshot(captureStateSnapshot());
      });
    }
  }, []);
}
