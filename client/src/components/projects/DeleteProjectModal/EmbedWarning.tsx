import { type FC } from 'react';
import { Alert, Typography } from 'antd';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';

type EmbedWarningAlertProps = {
  title: string;
  titleI18nKey: string;
  description: string;
  descriptionI18nKey: string;
};

const EmbedWarningAlert: FC<EmbedWarningAlertProps> = ({
  title,
  titleI18nKey,
  description,
  descriptionI18nKey,
}) => (
  <Alert
    type="warning"
    showIcon
    title={
      <Typography.Text strong className="text-sm" data-i18n-key={titleI18nKey}>
        {title}
      </Typography.Text>
    }
    description={
      <Typography.Text className="text-sm leading-snug" data-i18n-key={descriptionI18nKey}>
        {description}
      </Typography.Text>
    }
  />
);

type EmbedWarningProps = {
  /** How many of the projects being deleted have a public embed enabled. */
  embedEnabledCount: number;
  isBulk: boolean;
};

export const EmbedWarning: FC<EmbedWarningProps> = ({ embedEnabledCount, isBulk }) => {
  const { t } = useTypedTranslation();

  if (isBulk) {
    return (
      <EmbedWarningAlert
        title={t('messages.deleteProjectsBulkEmbedWarningTitle')}
        titleI18nKey="messages.deleteProjectsBulkEmbedWarningTitle"
        description={t('messages.deleteProjectsBulkEmbedWarningContent', {
          count: embedEnabledCount,
        })}
        descriptionI18nKey="messages.deleteProjectsBulkEmbedWarningContent"
      />
    );
  }

  return (
    <EmbedWarningAlert
      title={t('messages.deleteProjectEmbedWarningTitle')}
      titleI18nKey="messages.deleteProjectEmbedWarningTitle"
      description={t('messages.deleteProjectEmbedWarningContent')}
      descriptionI18nKey="messages.deleteProjectEmbedWarningContent"
    />
  );
};
