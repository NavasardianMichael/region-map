import { type FC, useMemo } from 'react';
import { Cropper, ImageRestriction, Priority } from 'react-advanced-cropper';
import { NavLink } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Flex, InputNumber, Segmented, Spin, Tooltip, Typography } from 'antd';
import { RESOLUTION_TIERS, type ResolutionTier } from '@/constants/exportTiers';
import { ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import {
  ASPECT_RATIO_OPTIONS,
  type AspectRatioPreset,
  type ExportCropState,
} from './useExportCrop';
import 'react-advanced-cropper/dist/style.css';

type Props = {
  crop: ExportCropState;
  isExporting: boolean;
};

export const Step: FC<Props> = ({ crop, isExporting }) => {
  const { t } = useTypedTranslation();
  const {
    cropperRef,
    previewSrc,
    isGeneratingPreview,
    aspectRatioPreset,
    aspectRatio,
    cropWidth,
    cropHeight,
    imageSize,
    selectedTier,
    highResolutionExport,
    HIGH_RES_TIER_MIN_HEIGHT,
    handleCropChange,
    handleAspectRatioChange,
    handleWidthChange,
    handleHeightChange,
    setSelectedTier,
  } = crop;
  const isDisabled = isGeneratingPreview || isExporting;

  const aspectRatioOptions = useMemo(
    () =>
      ASPECT_RATIO_OPTIONS.map((option) =>
        option.value === 'free'
          ? { ...option, label: t('visualizer.exportModal.aspectRatioPresetFree') }
          : option,
      ),
    [t],
  );

  const tierOptions = useMemo(
    () => [
      { value: null, label: t('visualizer.exportModal.tierOriginal') },
      ...RESOLUTION_TIERS.map(({ value, label, height }) => ({
        value,
        label,
        disabled: !highResolutionExport && height >= HIGH_RES_TIER_MIN_HEIGHT,
      })),
    ],
    [t, highResolutionExport, HIGH_RES_TIER_MIN_HEIGHT],
  );

  return (
    <Flex vertical gap="middle" className="pt-md pb-md">
      {isGeneratingPreview ? (
        <Flex justify="center" align="center" className="h-80">
          <Spin size="large" />
        </Flex>
      ) : previewSrc ? (
        <div className="export-cropper-container h-100">
          <Cropper
            ref={cropperRef}
            src={previewSrc}
            onChange={handleCropChange}
            imageRestriction={ImageRestriction.fitArea}
            priority={Priority.coordinates}
            defaultCoordinates={(state: { imageSize: { width: number; height: number } }) => ({
              left: 0,
              top: 0,
              width: state.imageSize.width,
              height: state.imageSize.height,
            })}
            stencilProps={{
              aspectRatio,
              movable: !isDisabled,
              resizable: !isDisabled,
            }}
            className="export-cropper"
          />
        </div>
      ) : null}

      <Flex vertical gap="small">
        <Flex align="center" gap="small">
          <Typography.Text
            className="text-sm text-gray-600"
            data-i18n-key="visualizer.exportModal.resolutionTierLabel"
          >
            {t('visualizer.exportModal.resolutionTierLabel')}
          </Typography.Text>
          {!highResolutionExport && (
            <Tooltip
              title={
                <span>
                  {t('visualizer.exportModal.tierHighResLocked')}{' '}
                  <NavLink
                    to={ROUTES.BILLING}
                    className="text-white! underline! underline-offset-2! hover:text-white!"
                  >
                    {t('visualizer.embed.upgradeBadgesLink')}
                  </NavLink>
                </span>
              }
            >
              <InfoCircleOutlined className="shrink-0 cursor-help text-gray-400" />
            </Tooltip>
          )}
        </Flex>
        <Segmented
          className="w-fit"
          value={selectedTier}
          onChange={(v) => setSelectedTier(v as ResolutionTier | null)}
          options={tierOptions}
          disabled={isDisabled}
        />
      </Flex>

      <Flex vertical gap="small">
        <Typography.Text
          className="text-sm text-gray-600"
          data-i18n-key="visualizer.exportModal.aspectRatioLabel"
        >
          {t('visualizer.exportModal.aspectRatioLabel')}
        </Typography.Text>
        <Segmented
          className="w-fit"
          value={aspectRatioPreset}
          onChange={(value: string) => handleAspectRatioChange(value as AspectRatioPreset)}
          options={aspectRatioOptions}
          disabled={isDisabled}
        />
      </Flex>

      <Flex vertical gap="small" className="mb-md!">
        <Typography.Text
          className="text-sm text-gray-600"
          data-i18n-key="visualizer.exportModal.resolutionLabel"
        >
          {t('visualizer.exportModal.resolutionLabel')}
        </Typography.Text>
        <Flex gap="small" align="center">
          <Flex align="center" gap="small">
            <Typography.Text
              className="text-xs text-gray-500"
              data-i18n-key="visualizer.exportModal.width"
            >
              {t('visualizer.exportModal.width')}
            </Typography.Text>
            <InputNumber
              min={1}
              max={imageSize?.width}
              value={cropWidth}
              onChange={handleWidthChange}
              disabled={isDisabled || selectedTier !== null}
            />
          </Flex>
          <Typography.Text className="text-xs text-gray-400">×</Typography.Text>
          <Flex align="center" gap="small">
            <Typography.Text
              className="text-xs text-gray-500"
              data-i18n-key="visualizer.exportModal.height"
            >
              {t('visualizer.exportModal.height')}
            </Typography.Text>
            <InputNumber
              min={1}
              max={imageSize?.height}
              value={cropHeight}
              onChange={handleHeightChange}
              disabled={isDisabled || selectedTier !== null}
            />
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
