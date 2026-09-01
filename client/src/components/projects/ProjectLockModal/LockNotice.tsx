import { type FC } from 'react';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { NoticeAlert } from '@/components/ui/NoticeAlert';

type LockNoticeProps = {
  /** True while unlocking, i.e. when protection is about to be removed. */
  isUnlocking: boolean;
};

export const LockNotice: FC<LockNoticeProps> = ({ isUnlocking }) => {
  const { t } = useTypedTranslation();

  if (isUnlocking) {
    return (
      <NoticeAlert
        type="warning"
        title={t('messages.unlockProjectWarningTitle')}
        titleI18nKey="messages.unlockProjectWarningTitle"
        description={t('messages.unlockProjectWarningContent')}
        descriptionI18nKey="messages.unlockProjectWarningContent"
      />
    );
  }

  return (
    <NoticeAlert
      type="info"
      title={t('messages.lockProjectInfoTitle')}
      titleI18nKey="messages.lockProjectInfoTitle"
      description={t('messages.lockProjectInfoContent')}
      descriptionI18nKey="messages.lockProjectInfoContent"
    />
  );
};
