import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { BADGE_DETAILS, BADGES, EXPORT_TYPES } from '@regionify/shared';
import { Modal as AntModal } from 'antd';
import { useShallow } from 'zustand/react/shallow';
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
import { LEGEND_POSITIONS } from '@/constants/legendStyles';
import {
  exportAnimationAsGif,
  exportAnimationAsVideo,
  type LegendPositionExport,
} from '@/helpers/animationExport';
import { loadMapSvg } from '@/helpers/mapLoader';
import { Form } from './Form';
import { Title } from './Title';

type AnimationFormat = typeof EXPORT_TYPES.gif | typeof EXPORT_TYPES.mp4;

type FormatOption = { value: AnimationFormat; label: string };

const ANIMATION_FORMAT_OPTIONS: FormatOption[] = [
  { value: EXPORT_TYPES.gif, label: 'GIF' },
  { value: EXPORT_TYPES.mp4, label: 'Video (MP4)' },
];

const EXPORT_FPS = 30;
const DEFAULT_SECONDS_PER_PERIOD = 1;

type Props = {
  open: boolean;
  onClose: () => void;
};

export const ExportAnimationModal: FC<Props> = ({ open, onClose }) => {
  const selectedCountryId = useVisualizerStore(selectSelectedCountryId);
  const timePeriods = useVisualizerStore(selectTimePeriods);
  const timelineData = useVisualizerStore(selectTimelineData);

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

  const watermarkActive = !limits.watermarkFree || picture.showWatermark;

  const defaultQuality = useMemo(
    () =>
      limits.pictureQualityLimit ? Math.min(60, limits.maxExportQuality) : limits.maxExportQuality,
    [limits.maxExportQuality, limits.pictureQualityLimit],
  );

  const [format, setFormat] = useState<AnimationFormat>(EXPORT_TYPES.gif);
  const [quality, setQuality] = useState(defaultQuality);
  const [secondsPerPeriod, setSecondsPerPeriod] = useState(DEFAULT_SECONDS_PER_PERIOD);
  const [smoothTransitions, setSmoothTransitions] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const allowedFormats = useMemo(
    () => ANIMATION_FORMAT_OPTIONS.filter((o) => limits.allowedAnimationFormats.includes(o.value)),
    [limits.allowedAnimationFormats],
  );

  useEffect(() => {
    if (open) setQuality(defaultQuality);
  }, [open, defaultQuality]);

  const handleExport = useCallback(async () => {
    if (!selectedCountryId || timePeriods.length < 2) return;

    setIsExporting(true);
    setProgress(0);

    try {
      const rawSvg = await loadMapSvg(selectedCountryId);
      if (!rawSvg) throw new Error('Failed to load map SVG');

      const exportLegendPosition: LegendPositionExport =
        legendPosition === LEGEND_POSITIONS.floating ? 'floating' : 'bottom';

      const legendDraw =
        legendPosition !== LEGEND_POSITIONS.hidden && legendItems.length > 0
          ? {
              title: legendTitle,
              labels: legendLabels,
              items: legendItems,
              noDataColor,
              transparentBackground: legendTransparentBackground,
              backgroundColor: legendBackgroundColor,
            }
          : null;

      const exportOptions = {
        rawSvg,
        timePeriods,
        timelineData,
        legendItems,
        noDataColor,
        border,
        shadow,
        picture,
        legendDraw,
        quality,
        fps: EXPORT_FPS,
        secondsPerPeriod,
        smooth: smoothTransitions,
        legendPosition: exportLegendPosition,
        regionLabels,
        labelPositions: labelPositionsByRegionId,
        watermark: watermarkActive ? ({ text: 'Regionify' } as const) : undefined,
        onProgress: setProgress,
      };

      if (format === EXPORT_TYPES.gif) {
        await exportAnimationAsGif(exportOptions);
      } else {
        await exportAnimationAsVideo(exportOptions);
      }

      onClose();
    } catch (error) {
      console.error('Animation export failed:', error);
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [
    selectedCountryId,
    timePeriods,
    timelineData,
    legendItems,
    noDataColor,
    border,
    shadow,
    picture,
    watermarkActive,
    legendPosition,
    regionLabels,
    labelPositionsByRegionId,
    legendLabels,
    legendTitle,
    legendBackgroundColor,
    legendTransparentBackground,
    quality,
    secondsPerPeriod,
    smoothTransitions,
    format,
    onClose,
  ]);

  return (
    <AntModal
      className="scrollbar-modal-host"
      title={<Title />}
      open={open}
      onCancel={onClose}
      confirmLoading={isExporting}
      maskClosable={false}
      keyboard={!isExporting}
      closable={{ disabled: isExporting }}
      centered
      footer={null}
      width={420}
      classNames={{ body: 'px-md' }}
      destroyOnHidden
    >
      <Form
        format={format}
        quality={quality}
        maxExportQuality={limits.maxExportQuality}
        secondsPerPeriod={secondsPerPeriod}
        smoothTransitions={smoothTransitions}
        isExporting={isExporting}
        progress={progress}
        timePeriodsCount={timePeriods.length}
        allowedFormats={allowedFormats}
        onFormatChange={setFormat}
        onQualityChange={(v) => setQuality(v ?? defaultQuality)}
        onSecondsPerPeriodChange={(v) => setSecondsPerPeriod(Math.max(0.5, Math.min(v ?? 1, 10)))}
        onSmoothTransitionsChange={setSmoothTransitions}
        onExport={handleExport}
      />
    </AntModal>
  );
};
