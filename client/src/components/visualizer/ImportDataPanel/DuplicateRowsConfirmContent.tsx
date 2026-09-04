import { type FC, useCallback, useState } from 'react';
import { Flex, Radio, type RadioChangeEvent, Typography } from 'antd';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { DUPLICATE_STRATEGIES, type DuplicateStrategy } from '@/helpers/importDuplicates';

type Props = {
  groupCount: number;
  extraRowCount: number;
  sampleRegions: string[];
  defaultStrategy: DuplicateStrategy;
  /** Called on every change; the caller keeps the latest choice for the modal's confirm handler. */
  onSelect: (strategy: DuplicateStrategy) => void;
};

/**
 * Confirm body when an import repeats the same region and period on several rows.
 * Owns its selection because `modal.confirm` renders content once and would not
 * re-render from state held by the panel.
 */
export const DuplicateRowsConfirmContent: FC<Props> = ({
  groupCount,
  extraRowCount,
  sampleRegions,
  defaultStrategy,
  onSelect,
}) => {
  const { t } = useTypedTranslation();
  const [strategy, setStrategy] = useState<DuplicateStrategy>(defaultStrategy);

  const handleChange = useCallback(
    (event: RadioChangeEvent) => {
      const next = event.target.value as DuplicateStrategy;
      setStrategy(next);
      onSelect(next);
    },
    [onSelect],
  );

  return (
    <Flex vertical gap="small">
      <Typography.Text data-i18n-key="visualizer.importData.duplicates.body">
        {t('visualizer.importData.duplicates.body', { groups: groupCount, rows: extraRowCount })}
      </Typography.Text>
      {sampleRegions.length > 0 && (
        <Typography.Text type="secondary" className="text-xs">
          {t('visualizer.importData.duplicates.examples', { regions: sampleRegions.join(', ') })}
        </Typography.Text>
      )}
      <Radio.Group value={strategy} onChange={handleChange}>
        <Flex vertical gap={4}>
          <Radio value={DUPLICATE_STRATEGIES.first}>
            {t('visualizer.importData.duplicates.strategyFirst')}
          </Radio>
          <Radio value={DUPLICATE_STRATEGIES.last}>
            {t('visualizer.importData.duplicates.strategyLast')}
          </Radio>
          <Radio value={DUPLICATE_STRATEGIES.sum}>
            {t('visualizer.importData.duplicates.strategySum')}
          </Radio>
          <Radio value={DUPLICATE_STRATEGIES.average}>
            {t('visualizer.importData.duplicates.strategyAverage')}
          </Radio>
        </Flex>
      </Radio.Group>
      <Typography.Text type="secondary" className="text-xs">
        {t('visualizer.importData.duplicates.hint')}
      </Typography.Text>
    </Flex>
  );
};
