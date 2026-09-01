import { type FC, useCallback, useMemo } from 'react';
import { CheckOutlined, LoadingOutlined } from '@ant-design/icons';
import { type Badge, BADGES, formatBadgePriceUsd } from '@regionify/shared';
import { Button, Card, Flex, Spin, Typography } from 'antd';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { trimZeroCents } from '@/helpers/trimZeroCents';
import type { BillingBadge, PayableBadge } from './types';

const BADGE_TIER_RANK: Record<Badge, number> = {
  [BADGES.observer]: 0,
  [BADGES.explorer]: 1,
  [BADGES.chronographer]: 2,
};

export type BadgeCardProps = {
  tier: BillingBadge;
  currentBadge: Badge;
  onUpgrade: (badge: PayableBadge) => void;
  upgradingBadge: PayableBadge | null;
  localizedPrice?: string;
  isPriceLoading?: boolean;
  shouldShowFallbackPrice?: boolean;
  hideButton?: boolean;
};

const BadgeCard: FC<BadgeCardProps> = ({
  tier,
  currentBadge,
  onUpgrade,
  upgradingBadge,
  localizedPrice,
  isPriceLoading = false,
  shouldShowFallbackPrice = true,
  hideButton = false,
}) => {
  const { t } = useTypedTranslation();
  const isCurrentBadge = tier.id === currentBadge;
  const isLowerTierThanCurrent = BADGE_TIER_RANK[tier.id] < BADGE_TIER_RANK[currentBadge];
  const isActionDisabled = isCurrentBadge || isLowerTierThanCurrent;
  const isUpgrading = upgradingBadge === tier.id;
  const showPopularHighlight = tier.popular && currentBadge === BADGES.observer;

  const handleClick = useCallback(() => {
    onUpgrade(tier.id as PayableBadge);
  }, [tier.id, onUpgrade]);

  const priceLabel = useMemo(() => {
    if (tier.price === 0) return t('badges.priceFree');
    if (localizedPrice)
      return t('badges.priceOneTimeVatIncluded', { price: trimZeroCents(localizedPrice) });
    if (shouldShowFallbackPrice)
      return t('badges.priceOneTimeVatIncluded', { price: formatBadgePriceUsd(tier.id) });
    return null;
  }, [tier.price, tier.id, localizedPrice, shouldShowFallbackPrice, t]);

  const buttonType = isCurrentBadge ? 'default' : 'primary';

  const cardClassName = `min-h-0 min-w-0 w-full flex-1 shadow-sm ${showPopularHighlight ? 'border-primary border-2' : ''}`;

  const cardStyles = useMemo(
    () => ({
      root: {
        display: 'flex' as const,
        flexDirection: 'column' as const,
        height: '100%',
        minHeight: 0,
        ...(showPopularHighlight ? { overflow: 'visible' as const } : {}),
      },
      body: {
        flex: 1,
        display: 'flex' as const,
        flexDirection: 'column' as const,
        minHeight: 0,
        ...(showPopularHighlight ? { overflow: 'visible' as const } : {}),
      },
    }),
    [showPopularHighlight],
  );

  return (
    <Card className={`relative overflow-visible ${cardClassName}`} styles={cardStyles}>
      {showPopularHighlight ? (
        <span
          className="bg-primary pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap text-white shadow-sm"
          data-i18n-key="badges.bestChoice"
        >
          {t('badges.bestChoice')}
        </span>
      ) : null}
      <Flex
        vertical
        gap="middle"
        className={`min-h-0 flex-1 ${showPopularHighlight ? 'pt-3' : ''}`}
      >
        <Flex
          vertical
          align="center"
          gap="small"
          className="w-full shrink-0 items-center text-center"
        >
          <Typography.Title
            level={3}
            className="text-primary mb-0! w-full text-center text-xl font-bold"
            data-i18n-key={`badges.items.${tier.id}.name`}
          >
            {tier.name}
          </Typography.Title>
          <Typography.Paragraph
            className="mb-0! w-full max-w-full text-center! text-gray-500"
            data-i18n-key={`badges.items.${tier.id}.description`}
          >
            {tier.description}
          </Typography.Paragraph>
          <Flex align="baseline" justify="center" gap={4} className="w-full">
            {tier.price === 0 ? (
              <Typography.Text
                className="text-primary text-4xl font-bold"
                data-i18n-key="badges.priceFree"
              >
                {priceLabel}
              </Typography.Text>
            ) : isPriceLoading && !localizedPrice ? (
              <Spin size="small" />
            ) : (
              <Typography.Text
                className="text-primary text-4xl font-bold"
                data-i18n-key="badges.priceOneTimeVatIncluded"
              >
                {priceLabel}
              </Typography.Text>
            )}
          </Flex>
        </Flex>

        <Flex vertical gap="small" className="min-h-0 w-full flex-1">
          {tier.features.map((feature, index) => (
            <Flex key={index} align="flex-start" gap="small" className="w-full">
              <CheckOutlined className="mt-0.5 shrink-0 text-green-500" />
              <Typography.Text
                className="text-left text-gray-700"
                data-i18n-key="badges.rows.advancedStyles"
              >
                {feature.text}
              </Typography.Text>
            </Flex>
          ))}
        </Flex>

        {!hideButton &&
          (isCurrentBadge ? (
            <Button
              type={buttonType}
              variant="outlined"
              color="default"
              block
              className="mt-auto shrink-0 overflow-hidden"
              disabled
              loading={isUpgrading}
              icon={isUpgrading ? <LoadingOutlined /> : undefined}
              onClick={handleClick}
              title={t('badges.currentBadge')}
              data-i18n-key="badges.currentBadge"
            >
              <span className="block truncate">{t('badges.currentBadge')}</span>
            </Button>
          ) : (
            <Button
              type={buttonType}
              variant="solid"
              color="primary"
              block
              className="mt-auto shrink-0 overflow-hidden"
              disabled={isActionDisabled}
              loading={isUpgrading}
              icon={isUpgrading ? <LoadingOutlined /> : undefined}
              onClick={handleClick}
              title={tier.buttonText}
              data-i18n-key="badges.items.explorer.buttonText"
            >
              <span className="block truncate">{tier.buttonText}</span>
            </Button>
          ))}
      </Flex>
    </Card>
  );
};

export default BadgeCard;
