import { type FC, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BADGE_DETAILS, BADGES } from '@regionify/shared';
import { Badge as AntBadge, Flex } from 'antd';
import { useShallow } from 'zustand/react/shallow';
import { selectItemsList } from '@/store/legendData/selectors';
import { useLegendDataStore } from '@/store/legendData/store';
import {
  selectFloatingMapFrameSize,
  selectFloatingPosition,
  selectFloatingSize,
  selectPosition,
  selectSetLegendStylesState,
} from '@/store/legendStyles/selectors';
import { useLegendStylesStore } from '@/store/legendStyles/store';
import {
  selectActiveTimePeriod,
  selectSelectedCountryId,
  selectTimePeriods,
} from '@/store/mapData/selectors';
import { useVisualizerStore } from '@/store/mapData/store';
import {
  selectPicture,
  selectSetLabelPositionsByRegionId,
  selectSetMapStylesState,
  selectSetViewport,
  selectTimePeriodLabelOffset,
  selectViewport,
} from '@/store/mapStyles/selectors';
import { useMapStylesStore } from '@/store/mapStyles/store';
import { selectUser } from '@/store/profile/selectors';
import { useProfileStore } from '@/store/profile/store';
import { LEGEND_POSITIONS } from '@/constants/legendStyles';
import { resolveOpaqueMapBackgroundColor } from '@/constants/mapStyles';
import {
  EMBED_BADGE_ZOOM_STACK_LIFT_PX,
  OBSERVER_BADGE_ZOOM_STACK_LIFT_PX,
} from '@/constants/mapViewer';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { badgeRibbonColor, badgeRibbonNameKey } from '@/helpers/badgeRibbonColor';
import { getLocalizedRegionLabel } from '@/helpers/regionDisplay';
import { scaleFloatingLegendPosition } from '@/helpers/scaleFloatingLegendPosition';
import { MadeWithRegionifyBadge } from '@/components/visualizer/MapViewer/MadeWithRegionifyBadge';
import { MapBottomLegend } from '@/components/visualizer/MapViewer/MapBottomLegend';
import { MapFloatingLegend } from '@/components/visualizer/MapViewer/MapFloatingLegend';
import { MapPanZoomControls } from '@/components/visualizer/MapViewer/MapPanZoomControls';
import { MapSvgCanvas } from '@/components/visualizer/MapViewer/MapSvgCanvas';
import { MapWatermark } from '@/components/visualizer/MapViewer/MapWatermark';
import { useLabelDrag } from '@/components/visualizer/MapViewer/useLabelDrag';
import {
  type EmbedLegendDragBinding,
  useLegendDrag,
} from '@/components/visualizer/MapViewer/useLegendDrag';
import { useMapPan } from '@/components/visualizer/MapViewer/useMapPan';
import { useMapSvg } from '@/components/visualizer/MapViewer/useMapSvg';
import { useTimePeriodLabelDrag } from '@/components/visualizer/MapViewer/useTimePeriodLabelDrag';

type MapViewerProps = {
  className?: string;
  /** When true (logged-in app session), show badge tier ribbon on the map export root block. */
  showBadgeRibbon?: boolean;
  /** Public embed: no card border or radius on the map frame. */
  flatEmbedChrome?: boolean;
  /** When false, do not force observer watermark behavior based on current user badge tier. */
  enforceObserverWatermark?: boolean;
};

/** `Badge.Ribbon` puts `className` on the ribbon tab; `rootClassName` targets `.ant-ribbon-wrapper`. */
const RIBBON_ROOT_CLASSNAME = 'flex h-full min-h-0 min-w-0 flex-1 flex-col';

/** No `rounded-lg` / border on the map frame when embed is flat or legend is bottom-pinned (outer shell can still carry card chrome). */
const mapFrameClassNames = (flatEmbedChrome: boolean, bottomPinnedLegend: boolean): string =>
  flatEmbedChrome || bottomPinnedLegend
    ? 'group relative min-h-0 flex-1 overflow-hidden'
    : 'group relative min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200';

const MapViewer: FC<MapViewerProps> = ({
  className = '',
  showBadgeRibbon = false,
  flatEmbedChrome = false,
  enforceObserverWatermark = true,
}) => {
  const { t, i18n } = useTypedTranslation();
  const user = useProfileStore(selectUser);
  const badge = user?.badge ?? BADGES.observer;
  const { limits } = BADGE_DETAILS[badge];
  const selectedCountryId = useVisualizerStore(selectSelectedCountryId);
  const timePeriods = useVisualizerStore(selectTimePeriods);
  const activeTimePeriod = useVisualizerStore(selectActiveTimePeriod);
  const picture = useMapStylesStore(selectPicture);
  const setLabelPositionsByRegionId = useMapStylesStore(selectSetLabelPositionsByRegionId);
  const setMapStylesState = useMapStylesStore(selectSetMapStylesState);
  const setViewport = useMapStylesStore(selectSetViewport);
  const timePeriodLabelOffset = useMapStylesStore(selectTimePeriodLabelOffset);
  const viewport = useMapStylesStore(selectViewport);
  const position = useLegendStylesStore(selectPosition);
  const floatingPosition = useLegendStylesStore(selectFloatingPosition);
  const floatingMapFrameSize = useLegendStylesStore(selectFloatingMapFrameSize);
  const floatingSize = useLegendStylesStore(selectFloatingSize);
  const setLegendStylesState = useLegendStylesStore(selectSetLegendStylesState);
  const legendItems = useLegendDataStore(useShallow(selectItemsList));
  const showBottomLegend = position === LEGEND_POSITIONS.bottom && legendItems.length > 0;

  const containerRef = useRef<HTMLButtonElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const periodLabelRef = useRef<HTMLDivElement>(null);
  const mapTransformRef = useRef<HTMLDivElement>(null);
  const mapExportMapAreaRef = useRef<HTMLDivElement>(null);
  const [embedMapFrameSize, setEmbedMapFrameSize] = useState({ width: 0, height: 0 });
  const [embedLegendRenderedSize, setEmbedLegendRenderedSize] = useState({ width: 0, height: 0 });
  /** Embed-only: drag result in iframe pixels; does not overwrite saved project coordinates. */
  const [embedLegendOverride, setEmbedLegendOverride] = useState<{
    key: string;
    position: { x: number; y: number };
  } | null>(null);

  const { svgContent, isLoading, labelPositionsRef, mapPathStyleOptions } = useMapSvg();

  const onResetLabelPositions = useCallback(() => {
    labelPositionsRef.current = {};
    setLabelPositionsByRegionId({});
    if (timePeriods.length > 1) {
      setMapStylesState({ timePeriodLabelOffset: { x: 0, y: 0 } });
    }
  }, [labelPositionsRef, setLabelPositionsByRegionId, setMapStylesState, timePeriods.length]);

  const {
    isDragging,
    isStepInteracting,
    handlePointerDown,
    handlePointerUp,
    handleZoomIn,
    handleZoomOut,
    handlePanUp,
    handlePanDown,
    handlePanLeft,
    handlePanRight,
    handleResetView,
  } = useMapPan({
    containerRef,
    mapTransformRef,
    onResetLabelPositions,
    initialViewport: viewport,
    onViewportChange: setViewport,
    svgContent,
  });

  /** Bypass CSS easing during any continuous gesture so direct DOM updates aren't smoothed. */
  const suppressMapTransition = isDragging || isStepInteracting;

  useLabelDrag({ containerRef, svgContent, labelPositionsRef, enabled: !flatEmbedChrome });

  const embedLegendOverrideKey = useMemo(
    () =>
      `${Number(flatEmbedChrome)}:${floatingPosition.x}:${floatingPosition.y}:${
        floatingMapFrameSize?.width ?? 0
      }:${floatingMapFrameSize?.height ?? 0}:${embedMapFrameSize.width}:${embedMapFrameSize.height}`,
    [
      flatEmbedChrome,
      floatingPosition.x,
      floatingPosition.y,
      floatingMapFrameSize,
      embedMapFrameSize.width,
      embedMapFrameSize.height,
    ],
  );

  useLayoutEffect(() => {
    if (!flatEmbedChrome || position !== LEGEND_POSITIONS.floating) return;
    const el = legendRef.current;
    if (!el) return;

    const applyLegendSize = (): void => {
      const { width, height } = el.getBoundingClientRect();
      const w = Math.round(width);
      const h = Math.round(height);
      setEmbedLegendRenderedSize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h },
      );
    };

    applyLegendSize();
    const ro = new ResizeObserver(applyLegendSize);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [flatEmbedChrome, position, floatingSize.width, floatingSize.height, legendItems.length]);

  const embedDisplayFloatingPosition = useMemo(() => {
    if (!flatEmbedChrome || position !== LEGEND_POSITIONS.floating) return undefined;
    if (embedLegendOverride?.key === embedLegendOverrideKey) {
      return embedLegendOverride.position;
    }
    const legendHeightForScale =
      floatingSize.height === 'auto' ? embedLegendRenderedSize.height : floatingSize.height;
    const legendSizeForScale =
      legendHeightForScale > 0 ? { width: floatingSize.width, height: legendHeightForScale } : null;
    const scaled = scaleFloatingLegendPosition(
      floatingPosition,
      floatingMapFrameSize,
      embedMapFrameSize,
      legendSizeForScale,
    );
    return scaled ?? floatingPosition;
  }, [
    flatEmbedChrome,
    position,
    embedLegendOverride,
    embedLegendOverrideKey,
    floatingPosition,
    floatingMapFrameSize,
    embedMapFrameSize,
    floatingSize.width,
    floatingSize.height,
    embedLegendRenderedSize.height,
  ]);

  const embedLegendDragBinding = useMemo((): EmbedLegendDragBinding | null => {
    if (!flatEmbedChrome || position !== LEGEND_POSITIONS.floating) return null;
    if (embedDisplayFloatingPosition == null) return null;
    return {
      layoutFloatingPosition: embedDisplayFloatingPosition,
      commitLayoutFloatingPosition: (next) =>
        setEmbedLegendOverride({ key: embedLegendOverrideKey, position: next }),
    };
  }, [flatEmbedChrome, position, embedDisplayFloatingPosition, embedLegendOverrideKey]);

  const { isLegendDragging, handleLegendMouseDown, handleResizeMouseDown } = useLegendDrag({
    containerRef,
    legendRef,
    embedLegendDrag: embedLegendDragBinding,
  });

  useLayoutEffect(() => {
    const el = mapExportMapAreaRef.current;
    if (!el) return;

    const applySize = (): void => {
      const { width, height } = el.getBoundingClientRect();
      const w = Math.round(width);
      const h = Math.round(height);
      if (flatEmbedChrome) {
        setEmbedMapFrameSize((prev) =>
          prev.width === w && prev.height === h ? prev : { width: w, height: h },
        );
      } else if (w > 0 && h > 0) {
        setLegendStylesState({ floatingMapFrameSize: { width: w, height: h } });
      }
    };

    applySize();
    const ro = new ResizeObserver(applySize);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [flatEmbedChrome, setLegendStylesState]);

  const showTimePeriodLabel = Boolean(activeTimePeriod && timePeriods.length > 1);
  const { isDragging: isPeriodLabelDragging, handlePeriodLabelPointerDown } =
    useTimePeriodLabelDrag({
      containerRef,
      periodLabelRef,
      enabled: showTimePeriodLabel,
    });

  const dateLocale = i18n.resolvedLanguage ?? i18n.language;
  const mapInteractiveAriaLabel = useMemo(() => {
    if (!selectedCountryId) return t('visualizer.mapAriaNoCountrySelected');
    const region = getLocalizedRegionLabel(selectedCountryId, dateLocale) ?? selectedCountryId;
    return t('visualizer.mapAriaMapOf', { region });
  }, [dateLocale, selectedCountryId, t]);

  const isForcedWatermark = enforceObserverWatermark && !limits.watermarkFree;
  const showWatermarkOverlay = useMemo(
    /** Public embed: `MadeWithRegionifyBadge` occupies the same bottom-right slot — suppress duplicate branding. */
    () => (isForcedWatermark || picture.showWatermark) && !flatEmbedChrome,
    [isForcedWatermark, picture.showWatermark, flatEmbedChrome],
  );

  /**
   * Lift zoom stack so it sits above the bottom-right badge/watermark. Both sit at the outer
   * wrapper level when a bottom legend is on, so the map frame keeps its default zoom position.
   */
  const zoomStackExtraBottomPx = useMemo(() => {
    if (showBottomLegend) return 0;
    if (flatEmbedChrome) return EMBED_BADGE_ZOOM_STACK_LIFT_PX;
    if (isForcedWatermark) return OBSERVER_BADGE_ZOOM_STACK_LIFT_PX;
    return 0;
  }, [showBottomLegend, flatEmbedChrome, isForcedWatermark]);

  const mapBackgroundStyle = useMemo(
    () => ({
      backgroundColor: picture.transparentBackground
        ? 'transparent'
        : resolveOpaqueMapBackgroundColor(picture),
    }),
    [picture],
  );

  const mapInterior = (
    <>
      <MapSvgCanvas
        containerRef={containerRef}
        mapTransformRef={mapTransformRef}
        periodLabelRef={periodLabelRef}
        svgContent={svgContent}
        isLoading={isLoading}
        mapPathStyleOptions={mapPathStyleOptions}
        suppressMapTransition={suppressMapTransition}
        ariaLabel={mapInteractiveAriaLabel}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        showTimePeriodLabel={showTimePeriodLabel}
        timePeriodLabelOffset={timePeriodLabelOffset}
        periodLabelDragging={isPeriodLabelDragging}
        onPeriodLabelPointerDown={handlePeriodLabelPointerDown}
      />

      {position === LEGEND_POSITIONS.floating && (
        <MapFloatingLegend
          legendRef={legendRef}
          isDragging={isLegendDragging}
          onLegendMouseDown={handleLegendMouseDown}
          onResizeMouseDown={handleResizeMouseDown}
          layoutPosition={flatEmbedChrome ? embedDisplayFloatingPosition : undefined}
        />
      )}

      {!showBottomLegend && <MapWatermark show={showWatermarkOverlay} />}

      {flatEmbedChrome && !showBottomLegend && <MadeWithRegionifyBadge />}

      <MapPanZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onPanUp={handlePanUp}
        onPanDown={handlePanDown}
        onPanLeft={handlePanLeft}
        onPanRight={handlePanRight}
        onResetView={handleResetView}
        zoomStackExtraBottomPx={zoomStackExtraBottomPx}
      />
    </>
  );

  const mapExportRoot = (
    <Flex vertical className={`min-h-0 flex-1 ${className}`} data-map-export-root>
      <Flex vertical className="h-full min-h-0 flex-1">
        {showBottomLegend ? (
          <Flex
            vertical
            className={
              flatEmbedChrome
                ? 'relative min-h-0 flex-1 flex-col overflow-hidden'
                : 'relative min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200'
            }
            ref={mapExportMapAreaRef}
            data-map-export-map-area
          >
            <Flex
              align="center"
              justify="center"
              className={mapFrameClassNames(flatEmbedChrome, showBottomLegend)}
              style={mapBackgroundStyle}
            >
              {mapInterior}
            </Flex>
            <MapBottomLegend />
            <MapWatermark show={showWatermarkOverlay} />
            {flatEmbedChrome && <MadeWithRegionifyBadge />}
          </Flex>
        ) : (
          <>
            <Flex
              align="center"
              justify="center"
              className={mapFrameClassNames(flatEmbedChrome, showBottomLegend)}
              ref={mapExportMapAreaRef}
              data-map-export-map-area
              style={mapBackgroundStyle}
            >
              {mapInterior}
            </Flex>
            <MapBottomLegend />
          </>
        )}
      </Flex>
    </Flex>
  );

  if (showBadgeRibbon && user) {
    return (
      <AntBadge.Ribbon
        text={t(badgeRibbonNameKey(badge))}
        color={badgeRibbonColor(badge)}
        placement="end"
        rootClassName={RIBBON_ROOT_CLASSNAME}
        className="top-2! font-medium"
        data-i18n-key="badges.items.observer.name"
      >
        {mapExportRoot}
      </AntBadge.Ribbon>
    );
  }

  return mapExportRoot;
};

export default MapViewer;
