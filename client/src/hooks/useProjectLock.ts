import { useCallback, useState } from 'react';
import { updateProjectLock } from '@/api/projects';
import type { Project } from '@/api/projects/types';
import { selectUpdateProjectInList } from '@/store/projects/selectors';
import { useProjectsStore } from '@/store/projects/store';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { useAppFeedback } from '@/components/shared/useAppFeedback';

type UseProjectLockReturn = {
  /** Project awaiting lock/unlock confirmation; `null` when the modal is closed. */
  pendingProject: Project | null;
  isSubmitting: boolean;
  requestToggle: (project: Project) => void;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
};

/**
 * Drives the lock/unlock confirmation cycle shared by the projects list and the visualizer.
 * The toggle direction is derived from the pending project's own `locked` value.
 */
export function useProjectLock(): UseProjectLockReturn {
  const { t } = useTypedTranslation();
  const { message } = useAppFeedback();
  const updateProjectInList = useProjectsStore(selectUpdateProjectInList);

  const [pendingProject, setPendingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestToggle = useCallback((project: Project) => {
    setPendingProject(project);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pendingProject) return;
    const nextLocked = !pendingProject.locked;
    setIsSubmitting(true);
    try {
      const updated = await updateProjectLock(pendingProject.id, { locked: nextLocked });
      updateProjectInList(updated);
      message.success(nextLocked ? t('messages.projectLocked') : t('messages.projectUnlocked'), 5);
      setPendingProject(null);
    } catch {
      message.error(t('messages.projectLockFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingProject, updateProjectInList, message, t]);

  const handleCancel = useCallback(() => {
    setPendingProject(null);
  }, []);

  return { pendingProject, isSubmitting, requestToggle, handleConfirm, handleCancel };
}
