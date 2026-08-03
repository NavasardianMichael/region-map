import { useCallback, useMemo, useState } from 'react';
import { BADGE_DETAILS, BADGES, EXPORT_TYPES, type ExportType } from '@regionify/shared';
import type { RadioChangeEvent } from 'antd';
import { useShallow } from 'zustand/react/shallow';
import {
  selectSecondsPerPeriod,
  selectSetSecondsPerPeriod,
  selectSetTransitionType,
  selectTransitionType,
} from '@/store/animation/selectors';
import { useAnimationStore } from '@/store/animation/store';
import { selectItemsList } from '@/store/legendData/selectors';
import { useLegendDataStore } from '@/store/legendData/store';
import {
  selectBackgroundColor,
  selectLabels,
  selectNoDataColor,
  selectPosition,
  selectTitle,
  selectTransparentBackground,
} from '@/store/legendStyles/selectors';
import { useLegendStylesStore } from '@/store/legendStyles/store';
import {
  selectHasTimelineData,
  selectSelectedCountryId,
  selectTimelineData,
  selectTimePeriods,
} from '@/store/mapData/selectors';
import { useVisualizerStore } from '@/store/mapData/store';
import {
  selectBorder,
  selectLabelPositionsByRegionId,
  selectPicture,
  selectRegionLabels,
  selectShadow,
} from '@/store/mapStyles/selectors';
import { useMapStylesStore } from '@/store/mapStyles/store';
import { selectUser } from '@/store/profile/selectors';
import { useProfileStore } from '@/store/profile/store';
import { RESOLUTION_TIERS } from '@/constants/exportTiers';
import { LEGEND_POSITIONS } from '@/constants/legendStyles';
import { resolveOpaqueMapBackgroundColor } from '@/constants/mapStyles';
import { PDF_PAGE_FORMAT_OPTIONS } from '@/constants/pdfExport';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { trackGa4FileDownload } from '@/helpers/analytics';
import {
  exportAnimationAsGif,
  exportAnimationAsVideo,
  type FrameOptions,
  generateAnimationPreviewCanvas,
  getAnimationTotalFrames,
  type LegendPositionExport,
} from '@/helpers/animationExport';
import {
  canvasToBlob,
  cropCanvas,
  drawWatermark,
  exportMapAsSvg,
  generateMapCanvas,
  generateMapCanvasFallback,
  type StillExportOpts,
  triggerDownload,
} from '@/helpers/mapExport';
import { loadMapSvg } from '@/helpers/mapLoader';
import {
  exportMapAsMultiPagePdf,
  exportMapAsSinglePagePdf,
  type PdfOrientation,
  type PdfPageFormat,
} from '@/helpers/pdfExport';
import { useAppFeedback } from '@/components/shared/useAppFeedback';
import { useExportCrop } from './Crop/useExportCrop';

type ExportTypeOption = { value: ExportType; label: string };

const ALL_EXPORT_OPTIONS: ExportTypeOption[] = [
  { value: EXPORT_TYPES.png, label: 'PNG' },
  { value: EXPORT_TYPES.svg, label: 'SVG' },
  { value: EXPORT_TYPES.jpeg, label: 'JPEG' },
  { value: EXPORT_TYPES.pdf, label: 'PDF' },
  { value: EXPORT_TYPES.gif, label: 'GIF (Animation)' },
  { value: EXPORT_TYPES.mp4, label: 'Video (MP4)' },
];

const STATIC_EXPORT_TYPES: ExportType[] = [EXPORT_TYPES.png, EXPORT_TYPES.svg, EXPORT_TYPES.jpeg];
const DYNAMIC_EXPORT_TYPES: ExportType[] = [EXPORT_TYPES.gif, EXPORT_TYPES.mp4];
const PDF_EXPORT_TYPES: ExportType[] = [EXPORT_TYPES.pdf];
const QUALITY_CONTROLLED_STATIC_EXPORT_TYPES: ExportType[] = [
  EXPORT_TYPES.png,
  EXPORT_TYPES.jpeg,
  EXPORT_TYPES.pdf,
];

const DEFAULT_SECONDS_PER_PERIOD = 1;

const defaultQualityForBadge = (maxQuality: number, pictureQualityLimited: boolean): number =>
  pictureQualityLimited ? Math.min(60, maxQuality) : maxQuality;
export const EXPORT_FPS = 30;

export function useExportMapModal(_open: boolean, onClose: () => void) {
  const { t } = useTypedTranslation();
  const { message } = useAppFeedback();
  const selectedCountryId = useVisualizerStore(selectSelectedCountryId);
  const hasTimelineData = useVisualizerStore(selectHasTimelineData);
  const timePeriods = useVisualizerStore(selectTimePeriods);
  const timelineData = useVisualizerStore(selectTimelineData);
  const previewSecondsPerPeriod = useAnimationStore(selectSecondsPerPeriod);
  const setPreviewSecondsPerPeriod = useAnimationStore(selectSetSecondsPerPeriod);
  const previewTransitionType = useAnimationStore(selectTransitionType);
  const setPreviewTransitionType = useAnimationStore(selectSetTransitionType);

  const user = useProfileStore(selectUser);
  const badge = user?.badge ?? BADGES.observer;
  const { limits } = BADGE_DETAILS[badge];

  const legendItems = useLegendDataStore(useShallow(selectItemsList));
  const noDataColor = useLegendStylesStore(selectNoDataColor);
  const legendLabels = useLegendStylesStore(selectLabels);
  const legendTitle = useLegendStylesStore(selectTitle);
  const legendBackgroundColor = useLegendStylesStore(selectBackgroundColor);
  const legendTransparentBackground = useLegendStylesStore(selectTransparentBackground);
  const legendPosition = useLegendStylesStore(selectPosition);
  const border = useMapStylesStore(selectBorder);
  const shadow = useMapStylesStore(selectShadow);
  const picture = useMapStylesStore(selectPicture);
  const regionLabels = useMapStylesStore(selectRegionLabels);
  const labelPositionsByRegionId = useMapStylesStore(selectLabelPositionsByRegionId);

  const maxQuality = limits.maxExportQuality;
  const initialQuality = defaultQualityForBadge(maxQuality, limits.pictureQualityLimit);
  const allowedFormats = limits.allowedExportFormats;
  const badgeSupportsDynamic = limits.historicalDataImport;

  const exportTypeOptions = useMemo(() => {
    const allowed = ALL_EXPORT_OPTIONS.filter((o) => allowedFormats.includes(o.value));
    if (hasTimelineData) {
      return allowed.filter(
        (o) => DYNAMIC_EXPORT_TYPES.includes(o.value) || PDF_EXPORT_TYPES.includes(o.value),
      );
    }
    return allowed.filter(
      (o) => STATIC_EXPORT_TYPES.includes(o.value) || PDF_EXPORT_TYPES.includes(o.value),
    );
  }, [allowedFormats, hasTimelineData]);

  const defaultExportType = exportTypeOptions[0]?.value ?? allowedFormats[0] ?? EXPORT_TYPES.jpeg;

  const exportTypeInfoTooltip = useMemo(() => {
    if (!badgeSupportsDynamic) return null;
    if (hasTimelineData) {
      return 'PDF exports as a multi-page document — one page per time period. Use GIF or MP4 for animated export.';
    }
    return 'Animated formats (GIF, MP4) require panel/dynamic data with a time column. Use static image formats with current data.';
  }, [badgeSupportsDynamic, hasTimelineData]);

  const [exportType, setExportType] = useState<ExportType>(defaultExportType);
  /** `null` while the user clears the field to type a new value; export uses `resolvedQuality`. */
  const [quality, setQuality] = useState<number | null>(initialQuality);
  const [secondsPerPeriod, setSecondsPerPeriod] = useState<number | null>(previewSecondsPerPeriod);
  const [smoothTransitions, setSmoothTransitions] = useState(previewTransitionType === 'smooth');
  const [pdfPageFormat, setPdfPageFormat] = useState<PdfPageFormat>('a4');
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>('portrait');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<1 | 2>(1);

  const isSvgFormat = exportType === EXPORT_TYPES.svg;
  const isAnimationFormat = exportType === EXPORT_TYPES.gif || exportType === EXPORT_TYPES.mp4;
  const isPdfFormat = exportType === EXPORT_TYPES.pdf;
  const skipCropStep = isSvgFormat || isPdfFormat || exportType === EXPORT_TYPES.mp4;

  const resolvedQuality = useMemo(() => {
    const q = quality;
    if (q === null) return defaultQualityForBadge(maxQuality, limits.pictureQualityLimit);
    return Math.min(Math.max(q, 1), maxQuality);
  }, [quality, maxQuality, limits.pictureQualityLimit]);

  const resolvedSecondsPerPeriod = useMemo(() => {
    const s = secondsPerPeriod;
    if (s === null) return DEFAULT_SECONDS_PER_PERIOD;
    return Math.max(0.5, Math.min(s, 10));
  }, [secondsPerPeriod]);

  const handleAfterOpenChange = useCallback(
    (visible: boolean) => {
      if (visible) {
        setExportType(defaultExportType);
        setQuality(defaultQualityForBadge(maxQuality, limits.pictureQualityLimit));
        setSecondsPerPeriod(previewSecondsPerPeriod);
        setSmoothTransitions(previewTransitionType === 'smooth');
        setPdfPageFormat('a4');
        setPdfOrientation('portrait');
        setStep(1);
      }
    },
    [
      defaultExportType,
      maxQuality,
      limits.pictureQualityLimit,
      previewSecondsPerPeriod,
      previewTransitionType,
    ],
  );

  const handleSmoothTransitionsChange = useCallback(
    (checked: boolean) => {
      setSmoothTransitions(checked);
      setPreviewTransitionType(checked ? 'smooth' : 'instant');
    },
    [setPreviewTransitionType],
  );

  const handleExportTypeChange = useCallback((value: ExportType) => {
    setExportType(value);
  }, []);

  const handlePdfPageFormatChange = useCallback(
    (value: PdfPageFormat) => setPdfPageFormat(value),
    [],
  );

  const handlePdfOrientationChange = useCallback(
    (e: RadioChangeEvent) => setPdfOrientation(e.target.value as PdfOrientation),
    [],
  );

  const handleQualityInputChange = useCallback((value: number | null) => {
    setQuality(value);
  }, []);

  const handleQualitySliderChange = useCallback(
    (value: number) => {
      setQuality(Math.min(value, maxQuality));
    },
    [maxQuality],
  );

  const handleQualityBlur = useCallback(() => {
    setQuality((q) => {
      if (q === null) return defaultQualityForBadge(maxQuality, limits.pictureQualityLimit);
      return Math.min(Math.max(q, 1), maxQuality);
    });
  }, [maxQuality, limits.pictureQualityLimit]);

  const handleSecondsInputChange = useCallback(
    (value: number | null) => {
      setSecondsPerPeriod(value);
      if (value !== null) {
        setPreviewSecondsPerPeriod(Math.max(0.5, Math.min(value, 10)));
      }
    },
    [setPreviewSecondsPerPeriod],
  );

  const handleSecondsBlur = useCallback(() => {
    setSecondsPerPeriod((s) => {
      const next = s === null ? previewSecondsPerPeriod : Math.max(0.5, Math.min(s, 10));
      setPreviewSecondsPerPeriod(next);
      return next;
    });
  }, [previewSecondsPerPeriod, setPreviewSecondsPerPeriod]);

  const watermarkActive = !limits.watermarkFree || picture.showWatermark;

  const staticStillOpts = useMemo(
    () => ({
      backgroundColor: picture.transparentBackground
        ? undefined
        : resolveOpaqueMapBackgroundColor(picture),
      legendDraw:
        legendPosition !== LEGEND_POSITIONS.hidden && legendItems.length > 0
          ? {
              title: legendTitle,
              labels: legendLabels,
              items: legendItems,
              noDataColor,
              transparentBackground: legendTransparentBackground,
              backgroundColor: legendBackgroundColor,
            }
          : null,
    }),
    [
      picture,
      legendPosition,
      legendItems,
      legendTitle,
      legendLabels,
      noDataColor,
      legendBackgroundColor,
      legendTransparentBackground,
    ],
  );

  const resolvedStillOpts = useMemo((): StillExportOpts => {
    const withWatermark = (base: StillExportOpts): StillExportOpts =>
      watermarkActive ? { ...base, watermark: { text: 'Regionify' } as const } : base;

    if (exportType === EXPORT_TYPES.jpeg) {
      return withWatermark({
        ...staticStillOpts,
        backgroundColor: staticStillOpts.backgroundColor ?? '#ffffff',
      });
    }
    return withWatermark(staticStillOpts);
  }, [exportType, staticStillOpts, watermarkActive]);

  const animationBaseOptions = useMemo(
    () => ({
      timePeriods,
      timelineData,
      legendItems,
      noDataColor,
      border,
      shadow,
      picture,
      legendDraw:
        legendPosition !== LEGEND_POSITIONS.hidden && legendItems.length > 0
          ? {
              title: legendTitle,
              labels: legendLabels,
              items: legendItems,
              noDataColor,
              transparentBackground: legendTransparentBackground,
              backgroundColor: legendBackgroundColor,
            }
          : null,
      quality: resolvedQuality,
      legendPosition: (legendPosition === LEGEND_POSITIONS.floating
        ? 'floating'
        : 'bottom') as LegendPositionExport,
      regionLabels,
      labelPositions: labelPositionsByRegionId,
      watermark: watermarkActive ? ({ text: 'Regionify' } as const) : undefined,
    }),
    [
      timePeriods,
      timelineData,
      legendItems,
      noDataColor,
      border,
      shadow,
      picture,
      legendTitle,
      legendLabels,
      legendBackgroundColor,
      legendTransparentBackground,
      resolvedQuality,
      legendPosition,
      regionLabels,
      labelPositionsByRegionId,
      watermarkActive,
    ],
  );

  const generatePreviewCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (isAnimationFormat) {
      if (!hasTimelineData || !selectedCountryId) return null;
      const rawSvg = await loadMapSvg(selectedCountryId);
      if (!rawSvg) return null;
      return generateAnimationPreviewCanvas({ rawSvg, ...animationBaseOptions });
    }

    const format = exportType === EXPORT_TYPES.jpeg ? 'jpeg' : 'png';
    const canvas = await generateMapCanvas(resolvedQuality, format, resolvedStillOpts);
    if (canvas) return canvas;
    return generateMapCanvasFallback(resolvedQuality, format, resolvedStillOpts);
  }, [
    isAnimationFormat,
    hasTimelineData,
    selectedCountryId,
    exportType,
    resolvedQuality,
    resolvedStillOpts,
    animationBaseOptions,
  ]);

  const crop = useExportCrop({
    generatePreviewCanvas,
    highResolutionExport: limits.highResolutionExport,
  });

  const handleNext = useCallback(async () => {
    setStep(2);
    await crop.generatePreview();
  }, [crop]);

  const handleBack = useCallback(() => {
    setStep(1);
    crop.reset();
  }, [crop]);

  const handleDownload = useCallback(async () => {
    const fileName = selectedCountryId ? `regionify-${selectedCountryId}` : 'regionify-map';

    setIsExporting(true);
    setProgress(0);
    try {
      if (isSvgFormat) {
        await exportMapAsSvg(fileName, resolvedStillOpts);
        trackGa4FileDownload({
          fileExtension: 'svg',
          assetType: 'map_image',
          country: selectedCountryId ?? undefined,
          userPlan: badge,
        });
        message.success(t('messages.mapExportedAs', { format: 'SVG' }), 5);
        onClose();
        return;
      }

      if (isPdfFormat) {
        if (hasTimelineData) {
          const rawSvg = await loadMapSvg(selectedCountryId!);
          if (!rawSvg) throw new Error('Failed to load map SVG');
          const pdfFrameOptions: FrameOptions = {
            legendItems: animationBaseOptions.legendItems,
            noDataColor: animationBaseOptions.noDataColor,
            border: animationBaseOptions.border,
            shadow: animationBaseOptions.shadow,
            picture: animationBaseOptions.picture,
            legendDraw: animationBaseOptions.legendDraw,
            legendPosition: animationBaseOptions.legendPosition,
            regionLabels: animationBaseOptions.regionLabels,
            labelPositions: animationBaseOptions.labelPositions,
          };
          await exportMapAsMultiPagePdf({
            rawSvg,
            timePeriods,
            timelineData,
            quality: resolvedQuality,
            fileName,
            frameOptions: pdfFrameOptions,
            watermark: watermarkActive ? { text: 'Regionify' } : undefined,
            backgroundColor: resolvedStillOpts.backgroundColor,
            onProgress: setProgress,
            pageFormat: pdfPageFormat,
            orientation: pdfOrientation,
          });
        } else {
          await exportMapAsSinglePagePdf({
            quality: resolvedQuality,
            fileName,
            stillOpts: resolvedStillOpts,
            pageFormat: pdfPageFormat,
            orientation: pdfOrientation,
          });
        }
        trackGa4FileDownload({
          fileExtension: 'pdf',
          assetType: 'map_pdf',
          country: selectedCountryId ?? undefined,
          userPlan: badge,
          pdfPageFormat: pdfPageFormat,
          pdfOrientation: pdfOrientation,
          isMultiPage: hasTimelineData,
        });
        message.success(t('messages.mapExportedAs', { format: 'PDF' }), 5);
        onClose();
        return;
      }

      if (isAnimationFormat) {
        if (!hasTimelineData) {
          message.warning(t('messages.importHistoricalFirst'));
          return;
        }
        const rawSvg = await loadMapSvg(selectedCountryId!);
        if (!rawSvg) throw new Error('Failed to load map SVG');

        const cropRect = crop.getCropRect() ?? undefined;

        const exportOptions = {
          rawSvg,
          ...animationBaseOptions,
          fps: EXPORT_FPS,
          secondsPerPeriod: resolvedSecondsPerPeriod,
          smooth: smoothTransitions,
          cropRect,
          onProgress: setProgress,
        };

        if (exportType === EXPORT_TYPES.gif) {
          await exportAnimationAsGif(exportOptions);
        } else {
          await exportAnimationAsVideo(exportOptions);
        }
        trackGa4FileDownload({
          fileExtension: exportType,
          assetType: 'map_animation',
          country: selectedCountryId ?? undefined,
          userPlan: badge,
          animationSmooth: smoothTransitions,
          animationSpeed: resolvedSecondsPerPeriod,
          periodCount: timePeriods.length,
        });
      } else {
        // Generate a fresh canvas WITHOUT watermark, crop it, then apply watermark
        // so the watermark is always correctly positioned in the final export.
        const { watermark, ...cleanOpts } = resolvedStillOpts;
        const format = exportType === EXPORT_TYPES.jpeg ? 'jpeg' : 'png';
        const activeTier = RESOLUTION_TIERS.find((t) => t.value === crop.selectedTier);
        const targetHeight = activeTier?.height;
        let cleanCanvas = await generateMapCanvas(resolvedQuality, format, cleanOpts, targetHeight);
        if (!cleanCanvas)
          cleanCanvas = await generateMapCanvasFallback(
            resolvedQuality,
            format,
            cleanOpts,
            targetHeight,
          );
        if (!cleanCanvas) throw new Error('Failed to generate export canvas');

        // When a tier is active it is always a full-frame export — skip crop.
        const cropRect = activeTier ? null : crop.getCropRect();
        const finalCanvas = cropRect ? cropCanvas(cleanCanvas, cropRect) : cleanCanvas;

        if (watermark) {
          const ctx = finalCanvas.getContext('2d');
          if (ctx) {
            await drawWatermark(ctx, finalCanvas.width, finalCanvas.height, watermark);
          }
        }

        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const blobQuality = format === 'jpeg' ? 0.92 : undefined;
        const ext = format === 'jpeg' ? 'jpeg' : 'png';

        const blob = await canvasToBlob(finalCanvas, mimeType, blobQuality);
        triggerDownload(blob, `${fileName}.${ext}`);
        trackGa4FileDownload({
          fileExtension: ext,
          assetType: 'map_image',
          country: selectedCountryId ?? undefined,
          userPlan: badge,
        });
      }
      message.success(t('messages.mapExportedAs', { format: exportType.toUpperCase() }), 5);
      onClose();
    } catch {
      message.error(t('messages.exportFailed'));
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [
    selectedCountryId,
    isSvgFormat,
    isPdfFormat,
    isAnimationFormat,
    message,
    t,
    exportType,
    onClose,
    resolvedStillOpts,
    badge,
    hasTimelineData,
    pdfPageFormat,
    pdfOrientation,
    animationBaseOptions,
    timePeriods,
    timelineData,
    resolvedQuality,
    watermarkActive,
    crop,
    resolvedSecondsPerPeriod,
    smoothTransitions,
  ]);

  const showQualityControl = useMemo(
    () => QUALITY_CONTROLLED_STATIC_EXPORT_TYPES.includes(exportType) || isAnimationFormat,
    [exportType, isAnimationFormat],
  );

  const downloadButtonLabel = useMemo(() => {
    if (exportType === EXPORT_TYPES.gif)
      return t('visualizer.exportModal.downloadFormat', { format: 'GIF' });
    if (exportType === EXPORT_TYPES.mp4)
      return t('visualizer.exportModal.downloadFormat', { format: 'Video' });
    return t('visualizer.exportModal.downloadFormat', { format: exportType.toUpperCase() });
  }, [exportType, t]);

  const totalAnimationFrames = useMemo(
    () =>
      getAnimationTotalFrames(timePeriods.length, {
        secondsPerPeriod: resolvedSecondsPerPeriod,
        fps: EXPORT_FPS,
        smooth: smoothTransitions,
      }),
    [timePeriods.length, resolvedSecondsPerPeriod, smoothTransitions],
  );

  return {
    step,
    exportType,
    defaultExportType,
    exportTypeOptions,
    exportTypeInfoTooltip,
    quality,
    resolvedQuality,
    secondsPerPeriod,
    resolvedSecondsPerPeriod,
    smoothTransitions,
    setSmoothTransitions: handleSmoothTransitionsChange,
    pdfPageFormat,
    pdfOrientation,
    pdfPageFormatOptions: PDF_PAGE_FORMAT_OPTIONS,
    handlePdfPageFormatChange,
    handlePdfOrientationChange,
    isExporting,
    progress,
    isSvgFormat,
    isAnimationFormat,
    isPdfFormat,
    skipCropStep,
    hasTimelineData,
    selectedCountryId,
    allowedFormats,
    limits,
    maxQuality,
    timePeriods,
    crop,
    handleAfterOpenChange,
    handleExportTypeChange,
    handleQualityInputChange,
    handleQualitySliderChange,
    handleQualityBlur,
    handleSecondsInputChange,
    handleSecondsBlur,
    handleDownload,
    handleNext,
    handleBack,
    showQualityControl,
    downloadButtonLabel,
    totalAnimationFrames,
  };
}

export type FormProps = ReturnType<typeof useExportMapModal>;
