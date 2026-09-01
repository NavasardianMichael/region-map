import { type FC } from 'react';
import { Flex, Modal as AntModal } from 'antd';
import type { Project } from '@/api/projects/types';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { Body } from './Body';
import { LockNotice } from './LockNotice';

type Props = {
  /** The project awaiting confirmation; `null` keeps the modal closed. */
  project: Project | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLoading?: boolean;
};

export const ProjectLockModal: FC<Props> = ({
  project,
  onConfirm,
  onCancel,
  confirmLoading = false,
}) => {
  const { t } = useTypedTranslation();

  // Confirming acts on the project's current state, so a locked project offers unlocking.
  const isUnlocking = project?.locked === true;

  const title = isUnlocking ? t('messages.unlockProjectTitle') : t('messages.lockProjectTitle');

  const bodyI18nKey = isUnlocking ? 'messages.unlockProjectContent' : 'messages.lockProjectContent';

  const bodyContent = t(bodyI18nKey, { name: project?.name ?? '' });

  const okText = isUnlocking ? t('messages.unlockProjectOk') : t('messages.lockProjectOk');

  return (
    <AntModal
      className="scrollbar-modal-host"
      title={title}
      destroyOnHidden
      open={project !== null}
      onOk={onConfirm}
      onCancel={onCancel}
      okText={okText}
      okButtonProps={{ danger: isUnlocking }}
      confirmLoading={confirmLoading}
      closable={{ disabled: confirmLoading }}
      centered
      maskClosable={false}
    >
      <Flex vertical gap="small" className="py-sm">
        <Body content={bodyContent} data-i18n-key={bodyI18nKey} />
        <LockNotice isUnlocking={isUnlocking} />
      </Flex>
    </AntModal>
  );
};
