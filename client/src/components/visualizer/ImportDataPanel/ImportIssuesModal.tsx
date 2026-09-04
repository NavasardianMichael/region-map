import { type FC } from 'react';
import { ExperimentOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Typography } from 'antd';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { type ImportIssues, UNMATCHED_SAMPLE_LIMIT } from '@/helpers/importDiagnostics';

type Props = {
  open: boolean;
  issues: ImportIssues;
  /** AI parse requests the user has left today. */
  remaining: number;
  maxRequestsPerDay: number;
  onUseAiParser: () => void;
  onImportAnyway: () => void;
  onCancel: () => void;
};

/**
 * Offered when an import loses a meaningful share of its data, before that data reaches the map.
 * Only rendered when the user actually has AI parse requests left — the panel gates on that,
 * since suggesting a feature the user cannot reach would be worse than the plain warning toast.
 */
export const ImportIssuesModal: FC<Props> = ({
  open,
  issues,
  remaining,
  maxRequestsPerDay,
  onUseAiParser,
  onImportAnyway,
  onCancel,
}) => {
  const { t } = useTypedTranslation();
  const { skippedRowCount, parsedRowCount, unmatchedRegions } = issues;
  const shown = unmatchedRegions.slice(0, UNMATCHED_SAMPLE_LIMIT);
  const overflow = unmatchedRegions.length - shown.length;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <Flex align="center" gap="small">
          <WarningOutlined className="text-amber-500" />
          <Typography.Text strong data-i18n-key="visualizer.importData.issues.title">
            {t('visualizer.importData.issues.title')}
          </Typography.Text>
        </Flex>
      }
      footer={
        <Flex justify="end" gap="small" wrap>
          <Button onClick={onCancel} data-i18n-key="nav.cancel">
            {t('nav.cancel')}
          </Button>
          <Button
            onClick={onImportAnyway}
            data-i18n-key="visualizer.importData.issues.importAnyway"
          >
            {t('visualizer.importData.issues.importAnyway')}
          </Button>
          <Button type="primary" icon={<ExperimentOutlined />} onClick={onUseAiParser}>
            {t('visualizer.importData.issues.useAiParser')}
          </Button>
        </Flex>
      }
    >
      <Flex vertical gap="small">
        <Typography.Text data-i18n-key="visualizer.importData.issues.body">
          {t('visualizer.importData.issues.body')}
        </Typography.Text>

        <Flex vertical gap={2} className="p-sm! rounded-md bg-gray-50">
          {skippedRowCount > 0 && (
            <Typography.Text className="text-xs">
              {t('visualizer.importData.issues.skippedRows', {
                count: skippedRowCount,
                parsed: parsedRowCount,
              })}
            </Typography.Text>
          )}
          {unmatchedRegions.length > 0 && (
            <Typography.Text className="text-xs">
              {t('visualizer.importData.issues.unmatchedRegions', {
                count: unmatchedRegions.length,
                regions: shown.join(', '),
              })}
              {overflow > 0 && ` ${t('visualizer.importData.issues.andMore', { count: overflow })}`}
            </Typography.Text>
          )}
        </Flex>

        <Typography.Text type="secondary" className="text-xs">
          {t('visualizer.aiParserModal.limitedRequestsNote', {
            count: remaining,
            max: maxRequestsPerDay,
          })}
        </Typography.Text>
        <Typography.Text type="secondary" className="text-xs">
          {t('visualizer.importData.issues.declineHint')}
        </Typography.Text>
      </Flex>
    </Modal>
  );
};
