import { type FC } from 'react';
import { type Badge, BADGE_DETAILS } from '@regionify/shared';
import {
  ColorPicker,
  type ColorPickerProps,
  Flex,
  Switch,
  type SwitchProps,
  Typography,
} from 'antd';
import type { PictureConfig } from '@/store/mapStyles/types';
import { resolveOpaqueMapBackgroundColor } from '@/constants/mapStyles';
import { ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { AppNavLink } from '@/components/ui/AppNavLink';

type BackgroundSectionProps = {
  badge: Badge;
  picture: PictureConfig;
  onTransparentChange: NonNullable<SwitchProps['onChange']>;
  onBackgroundColorChange: NonNullable<ColorPickerProps['onChangeComplete']>;
  onShowWatermarkChange: NonNullable<SwitchProps['onChange']>;
};

export const MapStylesBackgroundSection: FC<BackgroundSectionProps> = ({
  badge,
  picture,
  onTransparentChange,
  onBackgroundColorChange,
  onShowWatermarkChange,
}) => {
  const { t } = useTypedTranslation();
  const { limits } = BADGE_DETAILS[badge];
  const transparentChecked = limits.advancedStylesEnabled ? picture.transparentBackground : false;
  const watermarkChecked = limits.watermarkFree ? picture.showWatermark : true;
  const showUpgradeNote = !limits.advancedStylesEnabled || !limits.watermarkFree;

  return (
    <Flex vertical gap="small">
      {showUpgradeNote && (
        <Typography.Text type="secondary" className="mb-2 text-[13px]">
          {t('visualizer.mapStyles.freeBadgeNoteBeforeUpgrade')}
          <AppNavLink
            to={ROUTES.BILLING}
            className="text-[13px] font-medium"
            data-i18n-key="visualizer.mapStyles.freeBadgeUpgradeLink"
          >
            {t('visualizer.mapStyles.freeBadgeUpgradeLink')}
          </AppNavLink>
          {t('visualizer.mapStyles.freeBadgeNoteAfterUpgrade')}
        </Typography.Text>
      )}
      <Flex align="center" justify="space-between">
        <Typography.Text
          className="text-sm text-gray-600"
          id="transparent-bg-label"
          data-i18n-key="visualizer.mapStyles.transparent"
        >
          {t('visualizer.mapStyles.transparent')}
        </Typography.Text>
        <Switch
          checked={transparentChecked}
          size="small"
          onChange={onTransparentChange}
          aria-labelledby="transparent-bg-label"
          disabled={!limits.advancedStylesEnabled}
        />
      </Flex>
      <Flex align="center" justify="space-between">
        <Typography.Text
          className="text-sm text-gray-600"
          data-i18n-key="visualizer.mapStyles.color"
        >
          {t('visualizer.mapStyles.color')}
        </Typography.Text>
        <ColorPicker
          value={resolveOpaqueMapBackgroundColor(picture)}
          onChangeComplete={onBackgroundColorChange}
          size="small"
          disabled={picture.transparentBackground}
        />
      </Flex>
      <Flex align="center" justify="space-between">
        <Typography.Text
          className="text-sm text-gray-600"
          id="show-watermark-label"
          data-i18n-key="visualizer.mapStyles.showWatermark"
        >
          {t('visualizer.mapStyles.showWatermark')}
        </Typography.Text>
        <Switch
          checked={watermarkChecked}
          size="small"
          onChange={onShowWatermarkChange}
          aria-labelledby="show-watermark-label"
          disabled={!limits.watermarkFree}
        />
      </Flex>
    </Flex>
  );
};
