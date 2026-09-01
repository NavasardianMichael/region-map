import { type FC } from 'react';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { NoticeAlert } from '@/components/ui/NoticeAlert';

type EmbedWarningProps = {
  /** How many of the projects being deleted have a public embed enabled. */
  embedEnabledCount: number;
  isBulk: boolean;
};

export const EmbedWarning: FC<EmbedWarningProps> = ({ embedEnabledCount, isBulk }) => {
  const { t } = useTypedTranslation();

  if (isBulk) {
    return (
      <NoticeAlert
        type="warning"
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
    <NoticeAlert
      type="warning"
      title={t('messages.deleteProjectEmbedWarningTitle')}
      titleI18nKey="messages.deleteProjectEmbedWarningTitle"
      description={t('messages.deleteProjectEmbedWarningContent')}
      descriptionI18nKey="messages.deleteProjectEmbedWarningContent"
    />
  );
};
