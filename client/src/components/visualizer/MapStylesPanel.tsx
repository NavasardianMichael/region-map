import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { BgColorsOutlined } from '@ant-design/icons';
import { BADGE_DETAILS, BADGES } from '@regionify/shared';
import { Collapse, type ColorPickerProps, Flex, type SwitchProps, Typography } from 'antd';
import {
  selectBorder,
  selectRegionLabels,
  selectSetBorder,
  selectSetRegionLabels,
  selectSetShadow,
  selectSetZoomControls,
  selectShadow,
  selectZoomControls,
} from '@/store/mapStyles/selectors';
import { useMapStylesStore } from '@/store/mapStyles/store';
import { selectUser } from '@/store/profile/selectors';
import { useProfileStore } from '@/store/profile/store';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { MapStylesBackgroundSection } from '@/components/visualizer/MapStylesPanel/sections/MapStylesBackgroundSection';
import { MapStylesBorderSection } from '@/components/visualizer/MapStylesPanel/sections/MapStylesBorderSection';
import { MapStylesRegionLabelsSection } from '@/components/visualizer/MapStylesPanel/sections/MapStylesRegionLabelsSection';
import { MapStylesShadowSection } from '@/components/visualizer/MapStylesPanel/sections/MapStylesShadowSection';
import { MapStylesZoomSection } from '@/components/visualizer/MapStylesPanel/sections/MapStylesZoomSection';
import { SectionTitle } from '@/components/visualizer/SectionTitle';

const DEBOUNCE_MS = 150;

const MapStylesPanel: FC = () => {
  const { t } = useTypedTranslation();
  const user = useProfileStore(selectUser);
  const badge = user?.badge ?? BADGES.observer;
  const { limits } = BADGE_DETAILS[badge];
  const picture = useMapStylesStore((state) => state.picture);
  const setPicture = useMapStylesStore((state) => state.setPicture);
  const border = useMapStylesStore(selectBorder);
  const shadow = useMapStylesStore(selectShadow);
  const zoomControls = useMapStylesStore(selectZoomControls);
  const regionLabels = useMapStylesStore(selectRegionLabels);
  const setBorder = useMapStylesStore(selectSetBorder);
  const setShadow = useMapStylesStore(selectSetShadow);
  const setZoomControls = useMapStylesStore(selectSetZoomControls);
  const setRegionLabels = useMapStylesStore(selectSetRegionLabels);

  const [localOffsetX, setLocalOffsetX] = useState(shadow.offsetX);
  const [localOffsetY, setLocalOffsetY] = useState(shadow.offsetY);

  const debouncedSetOffsetX = useDebouncedCallback(
    (value: number) => setShadow({ offsetX: value }),
    DEBOUNCE_MS,
  );
  const debouncedSetOffsetY = useDebouncedCallback(
    (value: number) => setShadow({ offsetY: value }),
    DEBOUNCE_MS,
  );

  useEffect(() => {
    if (!limits.advancedStylesEnabled && picture.transparentBackground) {
      setPicture({ transparentBackground: false });
    }
  }, [limits.advancedStylesEnabled, picture.transparentBackground, setPicture]);

  const handleTransparentChange = useCallback<NonNullable<SwitchProps['onChange']>>(
    (checked) => {
      if (!limits.advancedStylesEnabled) return;
      setPicture({ transparentBackground: checked });
    },
    [setPicture, limits.advancedStylesEnabled],
  );
  const handleBackgroundColorChange = useCallback<
    NonNullable<ColorPickerProps['onChangeComplete']>
  >((color) => setPicture({ backgroundColor: color.toHexString() }), [setPicture]);
  const handleShowWatermarkChange = useCallback<NonNullable<SwitchProps['onChange']>>(
    (checked) => {
      if (!limits.watermarkFree) return;
      setPicture({ showWatermark: checked });
    },
    [setPicture, limits.watermarkFree],
  );

  const handleBorderShowChange = useCallback<NonNullable<SwitchProps['onChange']>>(
    (checked) => setBorder({ show: checked }),
    [setBorder],
  );
  const handleBorderColorChange = useCallback<NonNullable<ColorPickerProps['onChangeComplete']>>(
    (color) => setBorder({ color: color.toHexString() }),
    [setBorder],
  );
  const handleBorderWidthChange = useCallback(
    (value: number) => setBorder({ width: value }),
    [setBorder],
  );

  const handleShadowShowChange = useCallback<NonNullable<SwitchProps['onChange']>>(
    (checked) => setShadow({ show: checked }),
    [setShadow],
  );
  const handleShadowColorChange = useCallback<NonNullable<ColorPickerProps['onChangeComplete']>>(
    (color) => setShadow({ color: color.toHexString() }),
    [setShadow],
  );
  const handleShadowBlurChange = useCallback(
    (value: number) => setShadow({ blur: value }),
    [setShadow],
  );
  const handleShadowOffsetXChange = useCallback(
    (value: number | null) => {
      const val = value ?? 0;
      setLocalOffsetX(val);
      debouncedSetOffsetX(val);
    },
    [debouncedSetOffsetX],
  );
  const handleShadowOffsetYChange = useCallback(
    (value: number | null) => {
      const val = value ?? 0;
      setLocalOffsetY(val);
      debouncedSetOffsetY(val);
    },
    [debouncedSetOffsetY],
  );

  const handleZoomControlsShowChange = useCallback<NonNullable<SwitchProps['onChange']>>(
    (checked) => setZoomControls({ show: checked }),
    [setZoomControls],
  );

  const handleRegionLabelsShowChange = useCallback<NonNullable<SwitchProps['onChange']>>(
    (checked) => setRegionLabels({ show: checked }),
    [setRegionLabels],
  );
  const handleRegionLabelsColorChange = useCallback<
    NonNullable<ColorPickerProps['onChangeComplete']>
  >((color) => setRegionLabels({ color: color.toHexString() }), [setRegionLabels]);
  const handleRegionLabelsFontSizeChange = useCallback(
    (value: number) => setRegionLabels({ fontSize: value }),
    [setRegionLabels],
  );

  const items = useMemo(
    () => [
      {
        key: 'background',
        label: (
          <Flex align="center" gap="small">
            <Typography.Text
              className="font-semibold"
              data-i18n-key="visualizer.mapStyles.collapseBackground"
            >
              {t('visualizer.mapStyles.collapseBackground')}
            </Typography.Text>
          </Flex>
        ),
        children: (
          <MapStylesBackgroundSection
            badge={badge}
            picture={picture}
            onTransparentChange={handleTransparentChange}
            onBackgroundColorChange={handleBackgroundColorChange}
            onShowWatermarkChange={handleShowWatermarkChange}
          />
        ),
      },
      {
        key: 'border',
        label: (
          <Flex align="center" gap="small">
            <Typography.Text
              className="font-semibold"
              data-i18n-key="visualizer.mapStyles.collapseBorder"
            >
              {t('visualizer.mapStyles.collapseBorder')}
            </Typography.Text>
          </Flex>
        ),
        children: (
          <MapStylesBorderSection
            border={border}
            onShowChange={handleBorderShowChange}
            onColorChange={handleBorderColorChange}
            onWidthChange={handleBorderWidthChange}
          />
        ),
      },
      {
        key: 'shadow',
        label: (
          <Flex align="center" gap="small">
            <Typography.Text
              className="font-semibold"
              data-i18n-key="visualizer.mapStyles.collapseShadow"
            >
              {t('visualizer.mapStyles.collapseShadow')}
            </Typography.Text>
          </Flex>
        ),
        children: (
          <MapStylesShadowSection
            shadow={shadow}
            localOffsetX={localOffsetX}
            localOffsetY={localOffsetY}
            onShowChange={handleShadowShowChange}
            onColorChange={handleShadowColorChange}
            onBlurChange={handleShadowBlurChange}
            onOffsetXChange={handleShadowOffsetXChange}
            onOffsetYChange={handleShadowOffsetYChange}
          />
        ),
      },
      {
        key: 'zoom',
        label: (
          <Flex align="center" gap="small">
            <Typography.Text
              className="font-semibold"
              data-i18n-key="visualizer.mapStyles.collapseControls"
            >
              {t('visualizer.mapStyles.collapseControls')}
            </Typography.Text>
          </Flex>
        ),
        children: (
          <MapStylesZoomSection
            zoomControls={zoomControls}
            onShowChange={handleZoomControlsShowChange}
          />
        ),
      },
      {
        key: 'labels',
        label: (
          <Flex align="center" gap="small">
            <Typography.Text
              className="font-semibold"
              data-i18n-key="visualizer.mapStyles.collapseRegionLabels"
            >
              {t('visualizer.mapStyles.collapseRegionLabels')}
            </Typography.Text>
          </Flex>
        ),
        children: (
          <MapStylesRegionLabelsSection
            regionLabels={regionLabels}
            onShowChange={handleRegionLabelsShowChange}
            onColorChange={handleRegionLabelsColorChange}
            onFontSizeChange={handleRegionLabelsFontSizeChange}
          />
        ),
      },
    ],
    [
      badge,
      picture,
      border,
      shadow,
      localOffsetX,
      localOffsetY,
      zoomControls,
      regionLabels,
      handleTransparentChange,
      handleBackgroundColorChange,
      handleShowWatermarkChange,
      handleBorderShowChange,
      handleBorderColorChange,
      handleBorderWidthChange,
      handleShadowShowChange,
      handleShadowColorChange,
      handleShadowBlurChange,
      handleShadowOffsetXChange,
      handleShadowOffsetYChange,
      handleZoomControlsShowChange,
      handleRegionLabelsShowChange,
      handleRegionLabelsColorChange,
      handleRegionLabelsFontSizeChange,
      t,
    ],
  );

  return (
    <Flex vertical gap="middle">
      <SectionTitle
        IconComponent={BgColorsOutlined}
        data-i18n-key="visualizer.mapStyles.sectionTitle"
      >
        {t('visualizer.mapStyles.sectionTitle')}
      </SectionTitle>
      <Collapse items={items} defaultActiveKey={[]} ghost expandIconPlacement="end" />
    </Flex>
  );
};

export default MapStylesPanel;
