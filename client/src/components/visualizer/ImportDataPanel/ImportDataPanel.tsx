import {
  type CSSProperties,
  type FC,
  type JSX,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { NavLink } from 'react-router-dom';
import {
  CloudUploadOutlined,
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileExcelOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { BADGE_DETAILS, BADGES, extractGid } from '@regionify/shared';
import type { RadioChangeEvent, UploadProps } from 'antd';
import { Button, Flex, Radio, Spin, theme, Tooltip, Typography, Upload } from 'antd';
import { fetchAiRemaining } from '@/api/ai';
import {
  selectClearTimelineData,
  selectData,
  selectImportDataType,
  selectSelectedCountryId,
  selectSetTimelineData,
  selectSetVisualizerState,
  selectTimelineData,
  selectTimePeriods,
} from '@/store/mapData/selectors';
import { useVisualizerStore } from '@/store/mapData/store';
import type { DataSet, RegionData } from '@/store/mapData/types';
import { selectUser } from '@/store/profile/selectors';
import { useProfileStore } from '@/store/profile/store';
import { selectCurrentProject } from '@/store/projects/selectors';
import { useProjectsStore } from '@/store/projects/store';
import type { ImportDataType } from '@/types/mapData';
import { IMPORT_DATA_TYPES } from '@/constants/data';
import { ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { trackGa4FileDownload } from '@/helpers/analytics';
import { rowsToTabDelimited } from '@/helpers/datasetToTabDelimited';
import { writeRowsToXlsxFile } from '@/helpers/excelAsync';
import {
  convertToRegionData,
  IMPORT_FORMAT_ORDER,
  parseCSV,
  type ParsedRow,
  parseExcel,
  parseJSON,
  sanitizeFilename,
  sortTimePeriods,
} from '@/helpers/importDataParsers';
import {
  findImportIssues,
  hasSignificantIssues,
  type ImportIssues,
} from '@/helpers/importDiagnostics';
import {
  aggregateDuplicateRows,
  DUPLICATE_STRATEGIES,
  type DuplicateStrategy,
  findDuplicateRows,
} from '@/helpers/importDuplicates';
import { loadMapSvg } from '@/helpers/mapLoader';
import { canNormalizeLegendRanges, normalizeLegendRanges } from '@/helpers/normalizeLegendRanges';
import { getRegionDisplayName } from '@/helpers/regionDisplay';
import { extractSvgTitles } from '@/helpers/textSimilarity';
import { showMessageWithSampleDownload } from '@/components/shared/showMessageWithSampleDownload';
import { useAppFeedback } from '@/components/shared/useAppFeedback';
import type { GoogleSheetImportMode } from '@/components/visualizer/GoogleSheetsModal/types';
import { DuplicateRowsConfirmContent } from '@/components/visualizer/ImportDataPanel/DuplicateRowsConfirmContent';
import {
  generateSampleValue,
  showMessageWithClose,
  storeDataMatchesMapTitles,
} from '@/components/visualizer/ImportDataPanel/importDataPanelUtils';
import { ImportFormatExamples } from '@/components/visualizer/ImportDataPanel/ImportFormatExamples';
import { ImportFormatInfoTooltip } from '@/components/visualizer/ImportDataPanel/ImportFormatInfoTooltip';
import { ImportIssuesModal } from '@/components/visualizer/ImportDataPanel/ImportIssuesModal';
import { NormalizeRangesConfirmContent } from '@/components/visualizer/ImportDataPanel/NormalizeRangesConfirmContent';
import { SwitchModeConfirmContent } from '@/components/visualizer/ImportDataPanel/SwitchModeConfirmContent';
import { useGoogleSheetSyncEffect } from '@/components/visualizer/ImportDataPanel/useGoogleSheetSyncEffect';
import { SectionTitle } from '@/components/visualizer/SectionTitle';

const ManualDataEntryModal = lazy(() =>
  import('../ManualDataEntryModal/Modal').then((m) => ({ default: m.ManualDataEntryModal })),
);
const GoogleSheetsModal = lazy(() =>
  import('../GoogleSheetsModal/Modal').then((m) => ({ default: m.GoogleSheetsModal })),
);
const TabDelimitedTextModal = lazy(() =>
  import('../TabDelimitedTextModal/Modal').then((m) => ({ default: m.TabDelimitedTextModal })),
);
const AiParserModal = lazy(() =>
  import('../AiParserModal/Modal').then((m) => ({ default: m.AiParserModal })),
);

/** What the importer knows about where a set of parsed rows came from. */
type ImportSourceOptions = {
  /** Raw text of the imported source, handed to the AI parser on a retry. */
  sourceText?: string;
  skippedRowCount?: number;
};

/** An import held back by the quality check, awaiting the user's choice. */
type PendingImportIssues = {
  issues: ImportIssues;
  sourceText: string;
  apply: () => void;
};

/** Sample timeline labels for generated demo data: last N calendar years ending at the current year (ascending). */
const SAMPLE_TIMELINE_YEAR_COUNT = 5;

function sampleTimelineYearPeriods(): string[] {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - SAMPLE_TIMELINE_YEAR_COUNT + 1;
  return Array.from({ length: SAMPLE_TIMELINE_YEAR_COUNT }, (_, i) => String(startYear + i));
}

export const ImportDataPanel: FC = () => {
  const { t } = useTypedTranslation();
  const { modal, message: messageApi } = useAppFeedback();
  const { token } = theme.useToken();
  const user = useProfileStore(selectUser);
  const badge = user?.badge ?? BADGES.observer;
  const { limits } = BADGE_DETAILS[badge];

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isTabDelimitedModalOpen, setIsTabDelimitedModalOpen] = useState(false);
  const [isAiParserModalOpen, setIsAiParserModalOpen] = useState(false);
  const [aiParserInitialText, setAiParserInitialText] = useState<string | undefined>(undefined);
  const [importIssues, setImportIssues] = useState<PendingImportIssues | null>(null);
  const [aiRemaining, setAiRemaining] = useState(limits.aiParseRequestsPerDay);
  const [svgTitles, setSvgTitles] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);
  const skipSheetsRefetchOnceRef = useRef(false);
  const wasInStaticModeRef = useRef(false);

  const importDataType = useVisualizerStore(selectImportDataType);
  const selectedCountryId = useVisualizerStore(selectSelectedCountryId);
  const setVisualizerState = useVisualizerStore(selectSetVisualizerState);
  const setTimelineData = useVisualizerStore(selectSetTimelineData);
  const clearTimelineData = useVisualizerStore(selectClearTimelineData);
  const data = useVisualizerStore(selectData);
  const timelineData = useVisualizerStore(selectTimelineData);
  const timePeriods = useVisualizerStore(selectTimePeriods);

  const currentProject = useProjectsStore(selectCurrentProject);
  const googleUrl = useVisualizerStore((s) => s.google.url);
  const googleGid = useVisualizerStore((s) => s.google.gid);
  const isGoogleSheetSyncLoading = useVisualizerStore((s) => s.isGoogleSheetSyncLoading);

  const isGoogleSheetsLiveSync = importDataType === IMPORT_DATA_TYPES.sheets && Boolean(googleUrl);

  // Fetch remaining AI parse requests on mount for badges with AI parser access
  useEffect(() => {
    if (!limits.aiParser) return;
    fetchAiRemaining()
      .then(setAiRemaining)
      .catch(() => undefined);
  }, [limits.aiParser]);

  /** Auto-detected: current data is panel/dynamic (has time dimension). */
  const hasHistoricalFormat = useMemo(() => {
    return (
      limits.historicalDataImport &&
      timePeriods &&
      Array.isArray(timePeriods) &&
      timePeriods.length > 0 &&
      timelineData &&
      Object.keys(timelineData).length > 0
    );
  }, [limits.historicalDataImport, timePeriods, timelineData]);

  /** Download current dataset only (no sample generation). */
  const handleDownloadData = useCallback(async () => {
    if (data.allIds.length === 0) {
      showMessageWithClose(messageApi, 'warning', t('messages.noDataToDownload'));
      return;
    }

    setIsDownloading(true);

    try {
      let rows: Array<{ id: string; label: string; value: number; year?: string }>;
      const useHistoricalFormat = Boolean(
        hasHistoricalFormat &&
        timePeriods &&
        Array.isArray(timePeriods) &&
        timePeriods.length > 0 &&
        timelineData,
      );

      if (
        useHistoricalFormat &&
        timePeriods &&
        Array.isArray(timePeriods) &&
        timePeriods.length > 0 &&
        timelineData
      ) {
        rows = [];
        for (const period of timePeriods) {
          const periodData = timelineData[period];
          if (periodData) {
            for (const id of periodData.allIds) {
              const item = periodData.byId[id];
              rows.push({
                id: item.id,
                label: item.label,
                value: item.value,
                year: period,
              });
            }
          }
        }
      } else {
        rows = data.allIds.map((id) => ({
          id: data.byId[id].id,
          label: data.byId[id].label,
          value: data.byId[id].value,
        }));
      }

      // Small delay to ensure UI updates
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get project name for filename, fallback to 'data'
      const projectName = currentProject?.name ? sanitizeFilename(currentProject.name) : 'data';
      const suffix = useHistoricalFormat ? '-historical' : '';

      let content: string;
      let filename: string;
      let mimeType: string;

      switch (importDataType) {
        case 'json':
          content = JSON.stringify(rows, null, 2);
          filename = `${projectName}${suffix}.json`;
          mimeType = 'application/json';
          break;
        case 'excel': {
          const filename = `${projectName}${suffix}.xlsx`;
          await writeRowsToXlsxFile(filename, rows);
          trackGa4FileDownload({
            fileExtension: 'xlsx',
            assetType: 'dataset',
            country: selectedCountryId ?? undefined,
            userPlan: badge,
          });
          setIsDownloading(false);
          return;
        }
        case 'csv':
        default: {
          const headers = useHistoricalFormat ? 'id,label,value,year' : 'id,label,value';
          const csvRows = rows.map((r) => {
            if (useHistoricalFormat && r.year) {
              return `${r.id},${r.label},${r.value},${r.year}`;
            }
            return `${r.id},${r.label},${r.value}`;
          });
          content = '\uFEFF' + headers + '\n' + csvRows.join('\n');
          filename = `${projectName}${suffix}.csv`;
          mimeType = 'text/csv;charset=utf-8';
          break;
        }
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      trackGa4FileDownload({
        fileExtension: importDataType,
        assetType: 'dataset',
        country: selectedCountryId ?? undefined,
        userPlan: badge,
      });
    } catch (error) {
      console.error('Failed to download data:', error);
      showMessageWithClose(messageApi, 'error', t('messages.downloadDataFailed'));
    } finally {
      setIsDownloading(false);
    }
  }, [
    data.allIds,
    data.byId,
    messageApi,
    t,
    hasHistoricalFormat,
    timePeriods,
    timelineData,
    currentProject?.name,
    importDataType,
    selectedCountryId,
    badge,
  ]);

  /** Download sample data only (template with region IDs for matching). */
  const handleDownloadSampleOnly = useCallback(async () => {
    if (!selectedCountryId || svgTitles.length === 0) return;

    setIsDownloadingSample(true);
    try {
      const useHistoricalFormat = limits.historicalDataImport;
      let rows: Array<{ id: string; label: string; value: number; year?: string }>;

      if (useHistoricalFormat) {
        const samplePeriods = sampleTimelineYearPeriods();
        rows = [];
        for (const period of samplePeriods) {
          for (let i = 0; i < svgTitles.length; i++) {
            rows.push({
              id: svgTitles[i],
              label: svgTitles[i],
              value: generateSampleValue(i),
              year: period,
            });
          }
        }
      } else {
        rows = svgTitles.map((title) => ({
          id: title,
          label: title,
          value: Math.floor(Math.random() * 900) + 100,
        }));
      }

      const projectName = currentProject?.name ? sanitizeFilename(currentProject.name) : 'data';
      const suffix = useHistoricalFormat ? '-historical' : '';
      const baseName = `${projectName}-sample${suffix}`;

      let content: string;
      let filename: string;
      let mimeType: string;

      switch (importDataType) {
        case 'json':
          content = JSON.stringify(rows, null, 2);
          filename = `${baseName}.json`;
          mimeType = 'application/json';
          break;
        case 'excel': {
          await writeRowsToXlsxFile(`${baseName}.xlsx`, rows);
          trackGa4FileDownload({
            fileExtension: 'xlsx',
            assetType: 'sample_dataset',
            country: selectedCountryId ?? undefined,
            userPlan: badge,
          });
          setIsDownloadingSample(false);
          return;
        }
        case 'csv':
        default: {
          const headers = useHistoricalFormat ? 'id,label,value,year' : 'id,label,value';
          const csvRows = rows.map((r) => {
            if (useHistoricalFormat && r.year) {
              return `${r.id},${r.label},${r.value},${r.year}`;
            }
            return `${r.id},${r.label},${r.value}`;
          });
          content = '\uFEFF' + headers + '\n' + csvRows.join('\n');
          filename = `${baseName}.csv`;
          mimeType = 'text/csv;charset=utf-8';
          break;
        }
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      trackGa4FileDownload({
        fileExtension: importDataType,
        assetType: 'sample_dataset',
        country: selectedCountryId ?? undefined,
        userPlan: badge,
      });
    } catch (error) {
      console.error('Failed to download sample:', error);
      showMessageWithSampleDownload(
        messageApi,
        'error',
        t('messages.downloadSampleFailed'),
        handleDownloadSampleOnly,
        { downloadLabel: t('messages.downloadSample') },
      );
    } finally {
      setIsDownloadingSample(false);
    }
  }, [
    selectedCountryId,
    svgTitles,
    limits.historicalDataImport,
    currentProject?.name,
    importDataType,
    badge,
    messageApi,
    t,
  ]);

  const hasDataOrTimeline = data.allIds.length > 0 || timePeriods.length > 0;
  wasInStaticModeRef.current = hasDataOrTimeline && !hasHistoricalFormat;

  const importFormatOptions = useMemo(() => {
    const labelByType: Record<ImportDataType, JSX.Element | string> = {
      csv: t('visualizer.importData.format.csv'),
      excel: t('visualizer.importData.format.excel'),
      json: t('visualizer.importData.format.json'),
      sheets: t('visualizer.importData.format.sheets'),
      table: t('visualizer.importData.format.table'),
      tab_delimited: t('visualizer.importData.format.tabDelimited'),
      ai_parser: limits.aiParser ? (
        t('visualizer.importData.format.aiParser')
      ) : (
        <Tooltip
          styles={{
            container: {
              width: 'max-content',
              maxWidth: 'min(calc(100vw - 24px), 22rem)',
            },
          }}
          title={(() => {
            const onTooltip = token.colorTextLightSolid;
            const linkStyle: CSSProperties = {
              color: onTooltip,
              textDecoration: 'underline',
              textDecorationThickness: 'from-font',
              textUnderlineOffset: 4,
              fontWeight: 600,
            };
            return (
              <Flex vertical gap="small" align="flex-start" className="w-max">
                <Typography.Text
                  className="text-sm text-balance"
                  style={{ color: onTooltip }}
                  data-i18n-key="visualizer.importData.aiParserChronographerTooltip"
                >
                  {t('visualizer.importData.aiParserChronographerTooltip', {
                    badgeName: t('badges.items.explorer.name'),
                  })}
                </Typography.Text>
                <NavLink
                  to={ROUTES.BILLING}
                  className="text-sm text-white"
                  style={linkStyle}
                  data-i18n-key="visualizer.embed.upgradeBadgesLink"
                >
                  {t('visualizer.embed.upgradeBadgesLink')}
                </NavLink>
              </Flex>
            );
          })()}
        >
          <span data-i18n-key="visualizer.importData.format.aiParser">
            {t('visualizer.importData.format.aiParser')}
          </span>
        </Tooltip>
      ),
    };
    return IMPORT_FORMAT_ORDER.map((value) => ({
      label: labelByType[value],
      value,
      disabled: value === IMPORT_DATA_TYPES.aiParser && !limits.aiParser,
    }));
  }, [t, limits.aiParser, token.colorTextLightSolid]);

  const handleImportDataTypeChange = useCallback(
    (e: RadioChangeEvent) => {
      const next = e.target.value as ImportDataType;
      setVisualizerState({
        importDataType: next,
        ...(next !== IMPORT_DATA_TYPES.sheets ? { google: { url: null, gid: null } } : {}),
      });
    },
    [setVisualizerState],
  );

  /** Apply static mode: clear timeline and set data to sample (or empty if no region). */
  const applySwitchToStatic = useCallback(() => {
    clearTimelineData();
    if (svgTitles.length > 0) {
      const sampleData = svgTitles.map((title, index) => ({
        id: title,
        label: title,
        value: generateSampleValue(index),
      }));
      const allIds = sampleData.map((item) => item.id);
      const byId = Object.fromEntries(sampleData.map((item) => [item.id, item as RegionData]));
      setVisualizerState({ data: { allIds, byId } });
    } else {
      setVisualizerState({ data: { allIds: [], byId: {} } });
    }
    showMessageWithClose(messageApi, 'success', t('messages.switchedToStatic'));
  }, [messageApi, svgTitles, clearTimelineData, setVisualizerState, t]);

  /** Apply dynamic mode: set timeline to sample (or empty if no region). */
  const applySwitchToDynamic = useCallback(() => {
    if (svgTitles.length > 0) {
      const samplePeriods = sampleTimelineYearPeriods();
      const timeline: Record<string, DataSet> = {};
      for (const period of samplePeriods) {
        const periodData = svgTitles.map((title, i) => ({
          id: title,
          label: title,
          value: generateSampleValue(i),
        }));
        timeline[period] = {
          allIds: periodData.map((item) => item.id),
          byId: Object.fromEntries(periodData.map((item) => [item.id, item])),
        };
      }
      setTimelineData(timeline, samplePeriods);
    } else {
      setTimelineData({}, []);
    }
    showMessageWithClose(messageApi, 'success', t('messages.switchedToDynamic'));
  }, [messageApi, svgTitles, setTimelineData, t]);

  const handleSwitchToStatic = useCallback(() => {
    if (hasHistoricalFormat && hasDataOrTimeline) {
      modal.confirm({
        title: t('messages.switchToStaticConfirm'),
        content: <SwitchModeConfirmContent />,
        okText: t('messages.switch'),
        cancelText: t('nav.cancel'),
        onOk: applySwitchToStatic,
      });
    } else {
      applySwitchToStatic();
    }
  }, [modal, hasHistoricalFormat, hasDataOrTimeline, applySwitchToStatic, t]);

  const handleSwitchToDynamic = useCallback(() => {
    if (hasDataOrTimeline) {
      modal.confirm({
        title: t('messages.switchToDynamicConfirm'),
        content: <SwitchModeConfirmContent />,
        okText: t('messages.switch'),
        cancelText: t('nav.cancel'),
        onOk: applySwitchToDynamic,
      });
    } else {
      applySwitchToDynamic();
    }
  }, [modal, hasDataOrTimeline, applySwitchToDynamic, t]);

  /** After any import path commits new data, offer to redistribute legend ranges to match it —
   * imported values rarely share the same min/max as whatever ranges were already configured. */
  const offerToNormalizeRanges = useCallback(() => {
    if (!canNormalizeLegendRanges()) return;
    modal.confirm({
      title: t('visualizer.aiParserModal.normalizeRangesPromptTitle'),
      content: <NormalizeRangesConfirmContent />,
      okText: t('visualizer.legendConfig.normalizeRanges'),
      cancelText: t('nav.cancel'),
      onOk: () => {
        normalizeLegendRanges();
      },
    });
  }, [modal, t]);

  // Load SVG titles and generate sample data when region changes
  useEffect(() => {
    let cancelled = false;

    const loadSvgTitlesAndGenerateSampleData = async () => {
      if (!selectedCountryId) {
        setSvgTitles([]);
        setVisualizerState({ data: { allIds: [], byId: {} } });
        clearTimelineData();
        return;
      }

      try {
        const svgContent = await loadMapSvg(selectedCountryId);
        if (cancelled || useVisualizerStore.getState().selectedCountryId !== selectedCountryId) {
          return;
        }
        if (svgContent) {
          const titles = extractSvgTitles(svgContent);
          setSvgTitles(titles);

          if (titles.length > 0) {
            const viz = useVisualizerStore.getState();
            if (viz.selectedCountryId !== selectedCountryId) return;
            if (viz.importDataType === IMPORT_DATA_TYPES.sheets && Boolean(viz.google.url)) {
              return;
            }
            if (storeDataMatchesMapTitles(titles, viz.data, viz.timePeriods, viz.timelineData)) {
              return;
            }

            // Generate sample: respect user's current mode; only default to historical
            // on a fresh state (no data yet) for Explorer+ users.
            const useStaticMode = !limits.historicalDataImport || wasInStaticModeRef.current;

            if (useStaticMode) {
              const sampleData = titles.map((title, index) => ({
                id: title,
                label: title,
                value: generateSampleValue(index),
              }));
              const allIds = sampleData.map((item) => item.id);
              const byId = Object.fromEntries(sampleData.map((item) => [item.id, item]));
              clearTimelineData();
              setVisualizerState({ data: { allIds, byId } });
            } else {
              const samplePeriods = sampleTimelineYearPeriods();
              const timeline: Record<string, DataSet> = {};
              for (let p = 0; p < samplePeriods.length; p++) {
                const periodMultiplier = 1 + p * 0.1;
                const periodData = titles.map((title, i) => ({
                  id: title,
                  label: title,
                  value: Math.floor(generateSampleValue(i) * periodMultiplier),
                }));
                timeline[samplePeriods[p]] = {
                  allIds: periodData.map((item) => item.id),
                  byId: Object.fromEntries(periodData.map((item) => [item.id, item])),
                };
              }
              setTimelineData(timeline, samplePeriods);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load SVG titles:', error);
        if (!cancelled) {
          setSvgTitles([]);
        }
      }
    };

    loadSvgTitlesAndGenerateSampleData();

    return () => {
      cancelled = true;
    };
  }, [
    selectedCountryId,
    setVisualizerState,
    clearTimelineData,
    setTimelineData,
    limits.historicalDataImport,
  ]);

  /** Commit parsed rows — groups by time period for Atlas users or imports flat data. */
  const applyImportedData = useCallback(
    (parsed: ParsedRow[], onSuccess?: (data: unknown) => void) => {
      const hasTimePeriods = parsed.some((row) => row.timePeriod !== undefined);

      if (hasTimePeriods && limits.historicalDataImport) {
        const grouped: Record<string, ParsedRow[]> = {};

        for (const row of parsed) {
          const period = String(row.timePeriod ?? 'Unknown');
          if (!grouped[period]) grouped[period] = [];
          grouped[period].push(row);
        }

        // Chronological, not order of appearance — statistical exports are often newest-first.
        const periodOrder = sortTimePeriods(Object.keys(grouped));
        const timeline: Record<string, DataSet> = {};
        for (const period of periodOrder) {
          timeline[period] = convertToRegionData(grouped[period], svgTitles);
        }

        setTimelineData(timeline, periodOrder);
        showMessageWithClose(
          messageApi,
          'success',
          t('messages.importedRowsPeriods', { count: parsed.length, periods: periodOrder.length }),
        );
        onSuccess?.(timeline);
        offerToNormalizeRanges();
      } else {
        if (hasTimePeriods && !limits.historicalDataImport) {
          showMessageWithClose(
            messageApi,
            'info',
            t('messages.timeSeriesDetected', { badgeName: t('badges.items.explorer.name') }),
          );
        }
        if (limits.historicalDataImport) {
          showMessageWithClose(messageApi, 'warning', t('messages.noTimeColumnDetected'));
        }
        const regionData = convertToRegionData(parsed, svgTitles);
        clearTimelineData();
        setVisualizerState({ data: regionData });
        showMessageWithClose(
          messageApi,
          'success',
          t('messages.importedRegions', { count: parsed.length }),
        );
        onSuccess?.(regionData);
        offerToNormalizeRanges();
      }
    },
    [
      messageApi,
      limits.historicalDataImport,
      svgTitles,
      setVisualizerState,
      setTimelineData,
      clearTimelineData,
      offerToNormalizeRanges,
      t,
    ],
  );

  /**
   * Multi-dimensional exports (e.g. one row per age band) repeat a region within the same
   * period. Collapsing them silently would let an arbitrary row win, so ask how to combine.
   */
  const applyWithDuplicateCheck = useCallback(
    (parsed: ParsedRow[], onSuccess?: (data: unknown) => void) => {
      const duplicates = findDuplicateRows(parsed);
      if (duplicates.groupCount === 0) {
        applyImportedData(parsed, onSuccess);
        return;
      }

      let strategy: DuplicateStrategy = DUPLICATE_STRATEGIES.first;
      modal.confirm({
        title: t('visualizer.importData.duplicates.title'),
        width: 520,
        content: (
          <DuplicateRowsConfirmContent
            groupCount={duplicates.groupCount}
            extraRowCount={duplicates.extraRowCount}
            sampleRegions={duplicates.sampleRegions}
            defaultStrategy={strategy}
            onSelect={(next) => {
              strategy = next;
            }}
          />
        ),
        okText: t('visualizer.importData.duplicates.confirm'),
        cancelText: t('nav.cancel'),
        onOk: () => {
          applyImportedData(aggregateDuplicateRows(parsed, strategy), onSuccess);
        },
      });
    },
    [applyImportedData, modal, t],
  );

  /**
   * Gate every file import on a quality check. When a meaningful share of the data was lost,
   * offer the AI parser a chance at the same source before the thin result reaches the map —
   * but only when the user actually has requests left, otherwise the plain toast is all we can
   * honestly offer.
   */
  const processImportedData = useCallback(
    (parsed: ParsedRow[], onSuccess?: (data: unknown) => void, options?: ImportSourceOptions) => {
      const canOfferAiParser = limits.aiParser && aiRemaining > 0;
      if (!canOfferAiParser) {
        applyWithDuplicateCheck(parsed, onSuccess);
        return;
      }

      const issues = findImportIssues({
        rows: parsed,
        skippedRowCount: options?.skippedRowCount ?? 0,
        svgTitles,
      });
      if (!hasSignificantIssues(issues)) {
        applyWithDuplicateCheck(parsed, onSuccess);
        return;
      }

      // Reading the file succeeded — only its contents are in question — so settle the Upload
      // now rather than leaving it stuck mid-flight while the modal is open. The deferred apply
      // therefore gets no `onSuccess` of its own; it must not fire twice.
      onSuccess?.(null);
      setImportIssues({
        issues,
        sourceText: options?.sourceText ?? rowsToTabDelimited(parsed),
        apply: () => applyWithDuplicateCheck(parsed),
      });
    },
    [applyWithDuplicateCheck, aiRemaining, limits.aiParser, svgTitles],
  );

  const handleIssuesUseAiParser = useCallback(() => {
    if (!importIssues) return;
    setAiParserInitialText(importIssues.sourceText);
    setImportIssues(null);
    setIsAiParserModalOpen(true);
  }, [importIssues]);

  const handleIssuesImportAnyway = useCallback(() => {
    if (!importIssues) return;
    const { apply } = importIssues;
    setImportIssues(null);
    apply();
  }, [importIssues]);

  const handleIssuesCancel = useCallback(() => setImportIssues(null), []);

  const handleCloseAiParserModal = useCallback(() => {
    setIsAiParserModalOpen(false);
    setAiParserInitialText(undefined);
  }, []);

  const afterSheetCsvParsed = useCallback(
    (csv: string) => {
      const result = parseCSV(csv, { svgTitles });
      if ('error' in result) {
        showMessageWithSampleDownload(
          messageApi,
          'error',
          t('messages.missingColumns'),
          handleDownloadSampleOnly,
          { downloadLabel: t('messages.downloadSample') },
        );
        return;
      }
      if (result.rows.length === 0) {
        showMessageWithSampleDownload(
          messageApi,
          'error',
          t('messages.dataFormatMismatch'),
          handleDownloadSampleOnly,
          { downloadLabel: t('messages.downloadSample') },
        );
        return;
      }
      processImportedData(result.rows, undefined, {
        sourceText: csv,
        skippedRowCount: result.skippedRowCount,
      });
    },
    [handleDownloadSampleOnly, messageApi, processImportedData, svgTitles, t],
  );

  const afterSheetCsvParsedRef = useRef(afterSheetCsvParsed);
  afterSheetCsvParsedRef.current = afterSheetCsvParsed;

  const handleSheetImport = useCallback(
    (payload: { csv: string; url: string; mode: GoogleSheetImportMode }) => {
      const { csv, url, mode } = payload;
      const gid = extractGid(url);
      if (mode === 'sync') {
        skipSheetsRefetchOnceRef.current = true;
        setVisualizerState({
          google: { url, gid: gid ?? null },
          importDataType: IMPORT_DATA_TYPES.sheets,
        });
      } else {
        setVisualizerState({
          google: { url: null, gid: null },
          importDataType: IMPORT_DATA_TYPES.csv,
        });
      }
      afterSheetCsvParsed(csv);
    },
    [afterSheetCsvParsed, setVisualizerState],
  );

  useGoogleSheetSyncEffect({
    importDataType,
    googleUrl,
    selectedCountryId,
    svgTitles,
    setVisualizerState,
    messageApi,
    afterSheetCsvParsedRef,
    skipSheetsRefetchOnceRef,
    fetchFailedMessage: t('visualizer.googleSheets.fetchFailed'),
  });

  const handleFileUpload: UploadProps['customRequest'] = useCallback(
    (options: Parameters<NonNullable<UploadProps['customRequest']>>[0]) => {
      const { file, onSuccess, onError } = options;

      // Handle Excel files differently (binary)
      if (importDataType === 'excel') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const buffer = e.target?.result as ArrayBuffer;
            const parsed = await parseExcel(buffer, { svgTitles });

            if ('error' in parsed) {
              showMessageWithSampleDownload(
                messageApi,
                'error',
                t('messages.missingColumns'),
                handleDownloadSampleOnly,
                { downloadLabel: t('messages.downloadSample') },
              );
              onError?.(new Error('Missing required columns'));
              return;
            }

            if (parsed.rows.length === 0) {
              showMessageWithClose(messageApi, 'warning', t('messages.noValidDataExcel'));
              onError?.(new Error('No valid data found'));
              return;
            }

            // No raw text for a binary workbook — hand the AI parser the rows we did read.
            processImportedData(parsed.rows, onSuccess, {
              skippedRowCount: parsed.skippedRowCount,
            });
          } catch (error) {
            showMessageWithSampleDownload(
              messageApi,
              'error',
              t('messages.failedParseExcel'),
              handleDownloadSampleOnly,
              { downloadLabel: t('messages.downloadSample') },
            );
            onError?.(error as Error);
          }
        };
        reader.onerror = () => onError?.(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file as File);
        return;
      }

      // Handle text-based files (CSV, JSON)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let parsed: ParsedRow[] = [];
          let skippedRowCount = 0;

          if (importDataType === 'csv') {
            const result = parseCSV(content, { svgTitles });
            if ('error' in result) {
              showMessageWithSampleDownload(
                messageApi,
                'error',
                t('messages.missingColumns'),
                handleDownloadSampleOnly,
                { downloadLabel: t('messages.downloadSample') },
              );
              onError?.(new Error('Missing required columns'));
              return;
            }
            parsed = result.rows;
            skippedRowCount = result.skippedRowCount;
          } else if (importDataType === 'json') {
            const result = parseJSON(content);
            parsed = result.rows;
            skippedRowCount = result.skippedRowCount;
          }

          if (parsed.length === 0) {
            showMessageWithClose(messageApi, 'warning', t('messages.noValidDataFile'));
            onError?.(new Error('No valid data found'));
            return;
          }

          processImportedData(parsed, onSuccess, { sourceText: content, skippedRowCount });
        } catch (error) {
          showMessageWithSampleDownload(
            messageApi,
            'error',
            t('messages.failedParseFile'),
            handleDownloadSampleOnly,
            { downloadLabel: t('messages.downloadSample') },
          );
          onError?.(error as Error);
        }
      };

      reader.onerror = () => {
        onError?.(new Error('Failed to read file'));
      };

      reader.readAsText(file as File);
    },
    [messageApi, importDataType, processImportedData, handleDownloadSampleOnly, svgTitles, t],
  );

  const handleCopyGoogleSheetUrl = useCallback(async () => {
    if (!googleUrl) return;
    try {
      await navigator.clipboard.writeText(googleUrl);
      messageApi.success({
        content: t('visualizer.importData.sheetsUrlCopied'),
        duration: 2,
      });
    } catch {
      messageApi.error(t('visualizer.embed.copyFailed'));
    }
  }, [googleUrl, messageApi, t]);

  const importActionComponents: Record<ImportDataType, JSX.Element> = useMemo(
    () => ({
      table: (
        <Flex>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setIsManualModalOpen(true)}
            disabled={!selectedCountryId}
            data-i18n-key="visualizer.importData.editManuallyInTable"
          >
            {t('visualizer.importData.editManuallyInTable')}
          </Button>
        </Flex>
      ),
      tab_delimited: (
        <Flex>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setIsTabDelimitedModalOpen(true)}
            disabled={!selectedCountryId}
            data-i18n-key="visualizer.importData.editManuallyInText"
          >
            {t('visualizer.importData.editManuallyInText')}
          </Button>
        </Flex>
      ),
      ai_parser: (
        <Flex>
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            onClick={() => setIsAiParserModalOpen(true)}
            disabled={!selectedCountryId}
            data-i18n-key="visualizer.aiParserModal.submit"
          >
            {t('visualizer.aiParserModal.submit')}
          </Button>
        </Flex>
      ),
      sheets: (
        <Flex vertical gap="small" className="min-w-0">
          {googleUrl ? (
            <>
              <Typography.Text
                type="secondary"
                className="text-xs text-gray-600"
                data-i18n-key="visualizer.importData.sheetsSyncDescription"
              >
                {t('visualizer.importData.sheetsSyncDescription')}
              </Typography.Text>
              {isGoogleSheetSyncLoading ? (
                <Flex align="center" gap="small" className="text-xs text-gray-500">
                  <LoadingOutlined aria-hidden />
                  <span data-i18n-key="visualizer.importData.sheetsSyncLoading">
                    {t('visualizer.importData.sheetsSyncLoading')}
                  </span>
                </Flex>
              ) : null}
              <Flex align="center" gap="small" className="w-full max-w-full min-w-0">
                <span
                  className="min-w-0 flex-1 overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap text-gray-800"
                  title={googleUrl}
                >
                  {googleUrl}
                </span>
                <Tooltip
                  title={t('visualizer.importData.sheetsCopyUrlTooltip')}
                  data-i18n-key="visualizer.importData.sheetsCopyUrlTooltip"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => void handleCopyGoogleSheetUrl()}
                    aria-label={t('visualizer.importData.sheetsCopyUrlTooltip')}
                    className="shrink-0 text-gray-500"
                    data-i18n-key="visualizer.importData.sheetsCopyUrlTooltip"
                  />
                </Tooltip>
              </Flex>
              {googleGid ? (
                <Typography.Text
                  type="secondary"
                  className="text-xs"
                  data-i18n-key="visualizer.importData.sheetsTabId"
                >
                  {t('visualizer.importData.sheetsTabId', { gid: googleGid })}
                </Typography.Text>
              ) : null}
            </>
          ) : null}
          <Flex>
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={() => setIsSheetsModalOpen(true)}
            >
              {googleUrl
                ? t('visualizer.importData.changeSheetsSource')
                : t('visualizer.importData.connectSheets')}
            </Button>
          </Flex>
        </Flex>
      ),
      csv: (
        <Upload accept=".csv" customRequest={handleFileUpload} showUploadList={false} maxCount={1}>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            data-i18n-key="visualizer.importData.uploadCsv"
          >
            {t('visualizer.importData.uploadCsv')}
          </Button>
        </Upload>
      ),
      excel: (
        <Upload
          accept=".xlsx,.xls"
          customRequest={handleFileUpload}
          showUploadList={false}
          maxCount={1}
        >
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            block
            data-i18n-key="visualizer.importData.uploadExcel"
          >
            {t('visualizer.importData.uploadExcel')}
          </Button>
        </Upload>
      ),
      json: (
        <Upload accept=".json" customRequest={handleFileUpload} showUploadList={false} maxCount={1}>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            block
            data-i18n-key="visualizer.importData.uploadJson"
          >
            {t('visualizer.importData.uploadJson')}
          </Button>
        </Upload>
      ),
    }),
    [
      googleGid,
      googleUrl,
      handleCopyGoogleSheetUrl,
      handleFileUpload,
      isGoogleSheetSyncLoading,
      selectedCountryId,
      t,
    ],
  );

  return (
    <Flex vertical gap="middle">
      <Flex align="center" justify="space-between">
        <SectionTitle
          IconComponent={FileExcelOutlined}
          data-i18n-key="visualizer.importData.sectionTitle"
        >
          {t('visualizer.importData.sectionTitle')}
        </SectionTitle>
        <Flex gap={4} align="center">
          <Tooltip
            title={
              data.allIds.length === 0
                ? t('visualizer.importData.downloadTooltipEmpty')
                : t('visualizer.importData.downloadTooltip')
            }
          >
            <Button
              type="text"
              icon={isDownloading ? <LoadingOutlined /> : <DownloadOutlined />}
              size="small"
              onClick={handleDownloadData}
              className="text-gray-500"
              disabled={data.allIds.length === 0 || isDownloading}
              loading={isDownloading}
              aria-label={t('visualizer.importData.downloadAria')}
              data-i18n-key="visualizer.importData.downloadAria"
            />
          </Tooltip>

          <Tooltip
            title={
              selectedCountryId
                ? t('visualizer.importData.manualTooltip')
                : t('visualizer.importData.manualTooltipNoCountry')
            }
          >
            <span>
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => setIsManualModalOpen(true)}
                className="text-gray-500"
                disabled={!selectedCountryId}
                aria-label={t('visualizer.importData.manualAria')}
                data-i18n-key="visualizer.importData.manualAria"
              />
            </span>
          </Tooltip>
          {limits.historicalDataImport && (
            <Tooltip
              title={
                selectedCountryId
                  ? hasHistoricalFormat
                    ? t('visualizer.importData.switchToStatic')
                    : t('visualizer.importData.switchToDynamic')
                  : t('visualizer.importData.selectCountryFirst')
              }
            >
              <span>
                <Button
                  type="text"
                  icon={<SwapOutlined />}
                  size="small"
                  disabled={!selectedCountryId}
                  onClick={hasHistoricalFormat ? handleSwitchToStatic : handleSwitchToDynamic}
                  className="text-gray-500"
                  aria-label={
                    hasHistoricalFormat
                      ? t('visualizer.importData.switchAriaToStatic')
                      : t('visualizer.importData.switchAriaToDynamic')
                  }
                />
              </span>
            </Tooltip>
          )}
          <Tooltip title={<ImportFormatInfoTooltip />} placement="bottom">
            <InfoCircleOutlined className="cursor-help text-gray-400" />
          </Tooltip>
        </Flex>
      </Flex>

      <Flex vertical className="min-w-0">
        <Radio.Group
          options={importFormatOptions}
          value={importDataType}
          onChange={handleImportDataTypeChange}
          orientation="vertical"
          className="w-full min-w-0 [&_.ant-radio-wrapper]:mr-0! [&_.ant-radio-wrapper]:max-w-full [&_.ant-radio-wrapper]:items-start [&_.ant-radio-wrapper]:leading-snug [&_.ant-radio-wrapper]:whitespace-normal"
          aria-label={t('visualizer.importData.segmentedAria')}
          data-i18n-key="visualizer.importData.segmentedAria"
        />
      </Flex>

      {importActionComponents[importDataType]}

      {isManualModalOpen && (
        <Suspense fallback={<Spin />}>
          <ManualDataEntryModal
            open={isManualModalOpen}
            onClose={() => setIsManualModalOpen(false)}
            onSave={offerToNormalizeRanges}
            mapRegionIds={svgTitles}
            historicalDataImport={limits.historicalDataImport}
            googleSheetsSyncReadOnly={isGoogleSheetsLiveSync}
          />
        </Suspense>
      )}

      {isSheetsModalOpen && (
        <Suspense fallback={<Spin />}>
          <GoogleSheetsModal
            open={isSheetsModalOpen}
            onClose={() => setIsSheetsModalOpen(false)}
            onImport={handleSheetImport}
            initialUrl={googleUrl}
          />
        </Suspense>
      )}

      {isTabDelimitedModalOpen && (
        <Suspense fallback={<Spin />}>
          <TabDelimitedTextModal
            open={isTabDelimitedModalOpen}
            onClose={() => setIsTabDelimitedModalOpen(false)}
            onSave={offerToNormalizeRanges}
            mapRegionIds={svgTitles}
            historicalDataImport={limits.historicalDataImport}
          />
        </Suspense>
      )}

      {importIssues && (
        <ImportIssuesModal
          open
          issues={importIssues.issues}
          remaining={aiRemaining}
          maxRequestsPerDay={limits.aiParseRequestsPerDay}
          onUseAiParser={handleIssuesUseAiParser}
          onImportAnyway={handleIssuesImportAnyway}
          onCancel={handleIssuesCancel}
        />
      )}

      {isAiParserModalOpen && (
        <Suspense fallback={<Spin />}>
          <AiParserModal
            open={isAiParserModalOpen}
            onClose={handleCloseAiParserModal}
            onSave={offerToNormalizeRanges}
            mapRegionIds={svgTitles}
            initialText={aiParserInitialText}
            countryName={getRegionDisplayName(selectedCountryId) ?? undefined}
            historicalDataImport={limits.historicalDataImport}
            remaining={aiRemaining}
            onRemainingChange={setAiRemaining}
            maxRequestsPerDay={limits.aiParseRequestsPerDay}
          />
        </Suspense>
      )}

      <Flex vertical gap="small" className="p-sm! min-w-0 rounded-md bg-gray-50">
        <Typography.Text
          className="text-xs font-semibold text-gray-500"
          data-i18n-key="visualizer.importData.expectedFormat"
        >
          {t('visualizer.importData.expectedFormat')}
        </Typography.Text>
        <ImportFormatExamples
          importDataType={importDataType}
          hasHistoricalFormat={hasHistoricalFormat}
        />
      </Flex>

      <Flex gap="small" align="center" wrap="wrap" className="text-xs text-gray-500">
        <Typography.Text className="text-xs text-gray-500">
          {t('visualizer.importData.regionIdsNote')}{' '}
          <Tooltip
            title={
              !selectedCountryId ? t('visualizer.importData.downloadTooltipNoCountry') : undefined
            }
            data-i18n-key="visualizer.importData.downloadTooltipNoCountry"
          >
            <span>
              <Button
                type="text"
                size="small"
                icon={isDownloadingSample ? <LoadingOutlined /> : null}
                onClick={handleDownloadSampleOnly}
                disabled={!selectedCountryId || svgTitles.length === 0 || isDownloadingSample}
                loading={isDownloadingSample}
                className="h-auto p-0! align-baseline text-xs font-medium!"
                aria-label={t('messages.downloadSample')}
              >
                {!isDownloadingSample && t('visualizer.importData.downloadLink')}
              </Button>
            </span>
          </Tooltip>{' '}
          {t('visualizer.importData.sampleNoteSuffix')}
        </Typography.Text>
      </Flex>
    </Flex>
  );
};

export default ImportDataPanel;
