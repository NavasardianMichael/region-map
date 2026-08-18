import { type FC, useMemo } from 'react';
import { Flex, Modal as AntModal } from 'antd';
import type { Project } from '@/api/projects/types';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { Body } from './Body';
import { EmbedWarning } from './EmbedWarning';

type Props = {
  project: Project | null;
  /** When non-empty, modal shows bulk-delete copy; use `project: null` in this mode. */
  projectsBulk?: Project[] | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLoading?: boolean;
};

export const DeleteProjectModal: FC<Props> = ({
  project,
  projectsBulk = null,
  onConfirm,
  onCancel,
  confirmLoading = false,
}) => {
  const { t } = useTypedTranslation();

  const isBulk = projectsBulk != null && projectsBulk.length > 0;
  const open = project !== null || isBulk;

  const title = isBulk ? t('messages.deleteProjectsBulkTitle') : t('messages.deleteProjectTitle');

  const bodyContent = isBulk
    ? t('messages.deleteProjectsBulkContent', { count: projectsBulk!.length })
    : t('messages.deleteProjectContent', { name: project?.name ?? '' });

  const bodyI18nKey = isBulk
    ? 'messages.deleteProjectsBulkContent'
    : 'messages.deleteProjectContent';

  // A live public embed dies with the project, so deleting breaks any site that iframes it.
  const embedEnabledCount = useMemo(() => {
    if (projectsBulk != null && projectsBulk.length > 0) {
      return projectsBulk.filter((p) => p.embed.enabled).length;
    }
    return project !== null && project.embed.enabled ? 1 : 0;
  }, [project, projectsBulk]);

  return (
    <AntModal
      className="scrollbar-modal-host"
      title={title}
      destroyOnHidden
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText={t('messages.deleteProjectOk')}
      okButtonProps={{ danger: true }}
      confirmLoading={confirmLoading}
      closable={{ disabled: confirmLoading }}
      centered
      maskClosable={false}
    >
      <Flex vertical gap="small" className="py-sm">
        <Body content={bodyContent} data-i18n-key={bodyI18nKey} />
        {embedEnabledCount > 0 ? (
          <EmbedWarning embedEnabledCount={embedEnabledCount} isBulk={isBulk} />
        ) : null}
      </Flex>
    </AntModal>
  );
};
