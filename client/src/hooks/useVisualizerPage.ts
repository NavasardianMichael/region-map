import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BADGE_DETAILS, BADGES, ErrorCode } from '@regionify/shared';
import { createProject, deleteProject as deleteProjectApi, updateProject } from '@/api/projects';
import { selectSelectedCountryId } from '@/store/mapData/selectors';
import { useVisualizerStore } from '@/store/mapData/store';
import { selectIsLoggedIn, selectUser } from '@/store/profile/selectors';
import { useProfileStore } from '@/store/profile/store';
import {
  selectAddProject,
  selectCurrentProject,
  selectCurrentProjectId,
  selectRemoveProject,
  selectSetCurrentProjectId,
  selectSetSavedStateSnapshot,
  selectUpdateProjectInList,
} from '@/store/projects/selectors';
import { useProjectsStore } from '@/store/projects/store';
import {
  captureStateSnapshot,
  getProjectPayload,
  useHasUnsavedChanges,
} from '@/hooks/useProjectState';
import { getProjectRoute, ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { captureFullTemporaryProjectState } from '@/helpers/captureFullTemporaryProjectState';
import { getErrorCode } from '@/helpers/error';
import { getLocalizedRegionLabel } from '@/helpers/regionDisplay';
import {
  buildPartialTemporaryState,
  clearTemporaryProjectState,
  saveReturnUrl,
  saveTemporaryProjectState,
} from '@/helpers/temporaryProjectState';
import { useAppFeedback } from '@/components/shared/useAppFeedback';

export function useVisualizerPage() {
  const { t, i18n } = useTypedTranslation();
  const { message } = useAppFeedback();
  const navigate = useNavigate();
  const selectedCountryId = useVisualizerStore(selectSelectedCountryId);
  const isLoggedIn = useProfileStore(selectIsLoggedIn);
  const user = useProfileStore(selectUser);
  const currentProjectId = useProjectsStore(selectCurrentProjectId);
  const currentProject = useProjectsStore(selectCurrentProject);
  const setCurrentProjectId = useProjectsStore(selectSetCurrentProjectId);
  const setSavedStateSnapshot = useProjectsStore(selectSetSavedStateSnapshot);
  const addProject = useProjectsStore(selectAddProject);
  const updateProjectInList = useProjectsStore(selectUpdateProjectInList);
  const removeProject = useProjectsStore(selectRemoveProject);
  const hasUnsavedChanges = useHasUnsavedChanges();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isRenameSubmitting, setIsRenameSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const isFreePlan = useMemo(() => !user || user.badge === BADGES.observer, [user]);

  const isCurrentProjectLocked = currentProject?.locked === true;

  const canUseEmbed = useMemo(() => {
    const badge = user?.badge;
    if (!badge) return false;
    return BADGE_DETAILS[badge]?.limits.publicEmbed === true;
  }, [user?.badge]);

  const handleOpenExportModal = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  const handleCloseExportModal = useCallback(() => {
    setIsExportModalOpen(false);
  }, []);

  /**
   * Silently saves an existing project (no modals, no redirects).
   * Returns `true` on success, `false` on failure or when the project hasn't been created yet.
   */
  const saveCurrentProject = useCallback(async (): Promise<boolean> => {
    if (!currentProjectId || isCurrentProjectLocked) return false;
    try {
      const payload = getProjectPayload();
      const updated = await updateProject(currentProjectId, payload);
      updateProjectInList(updated);
      setSavedStateSnapshot(captureStateSnapshot());
      clearTemporaryProjectState();
      message.success(t('messages.projectSaved'), 5);
      return true;
    } catch (error) {
      // Another tab may have locked the project since this one loaded it.
      const isLockedError = getErrorCode(error) === ErrorCode.PROJECT_LOCKED;
      message.error(
        isLockedError ? t('messages.projectLockedError') : t('messages.projectSaveFailed'),
      );
      return false;
    }
  }, [
    currentProjectId,
    isCurrentProjectLocked,
    updateProjectInList,
    setSavedStateSnapshot,
    message,
    t,
  ]);

  const handleOpenEmbedModal = useCallback(async () => {
    // Opening persists pending edits first, which a locked project must not do.
    if (!canUseEmbed || isCurrentProjectLocked) return;
    if (!isLoggedIn) {
      const fullCurrent = captureFullTemporaryProjectState();
      saveTemporaryProjectState(buildPartialTemporaryState(fullCurrent));
      saveReturnUrl(window.location.pathname);
      navigate(ROUTES.LOGIN);
      return;
    }
    if (!currentProjectId) return;

    // The public embed page reads the last-saved project row, so unsaved edits
    // (e.g. freshly imported timeline data) must be persisted before it can open.
    if (hasUnsavedChanges) {
      setIsSaving(true);
      try {
        const saved = await saveCurrentProject();
        if (!saved) return;
      } finally {
        setIsSaving(false);
      }
    }

    setIsEmbedModalOpen(true);
  }, [
    canUseEmbed,
    isCurrentProjectLocked,
    isLoggedIn,
    currentProjectId,
    hasUnsavedChanges,
    saveCurrentProject,
    navigate,
  ]);

  const handleCloseEmbedModal = useCallback(() => {
    setIsEmbedModalOpen(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (isFreePlan && !isLoggedIn) {
      saveTemporaryProjectState(buildPartialTemporaryState(captureFullTemporaryProjectState()));
      saveReturnUrl(window.location.pathname);
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!currentProjectId) {
      const locale = i18n.resolvedLanguage ?? i18n.language;
      const regionLabel =
        selectedCountryId != null ? (getLocalizedRegionLabel(selectedCountryId, locale) ?? '') : '';
      setProjectName(String(regionLabel));
      setIsNameModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      await saveCurrentProject();
    } finally {
      setIsSaving(false);
    }
  }, [
    isFreePlan,
    isLoggedIn,
    currentProjectId,
    selectedCountryId,
    i18n.language,
    i18n.resolvedLanguage,
    saveCurrentProject,
    navigate,
  ]);

  const handleCreateProject = useCallback(async () => {
    if (!projectName.trim()) return;

    setIsSaving(true);
    setIsNameModalOpen(false);
    try {
      const payload = getProjectPayload(projectName.trim());
      const created = await createProject(payload);
      addProject(created);
      setCurrentProjectId(created.id);
      setSavedStateSnapshot(captureStateSnapshot());
      clearTemporaryProjectState();
      navigate(getProjectRoute(created.id), { replace: true });
      message.success(t('messages.projectCreated'), 5);
      setProjectName('');
    } catch {
      message.error(t('messages.projectCreateFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [projectName, addProject, setCurrentProjectId, setSavedStateSnapshot, message, navigate, t]);

  const handleNameModalCancel = useCallback(() => {
    setIsNameModalOpen(false);
    setProjectName('');
  }, []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
  }, []);

  const handleOpenRenameModal = useCallback(() => {
    if (!currentProject || isCurrentProjectLocked) return;
    setIsRenameModalOpen(true);
  }, [currentProject, isCurrentProjectLocked]);

  const handleRenameModalCancel = useCallback(() => {
    setIsRenameModalOpen(false);
  }, []);

  const handleRenameModalConfirm = useCallback(
    async (trimmed: string) => {
      if (!currentProjectId || !currentProject) return;
      setIsRenameSubmitting(true);
      try {
        const updated = await updateProject(currentProjectId, { name: trimmed });
        updateProjectInList(updated);
        message.success(t('messages.projectRenamed'), 5);
        setIsRenameModalOpen(false);
      } catch {
        message.error(t('messages.projectRenameFailed'));
      } finally {
        setIsRenameSubmitting(false);
      }
    },
    [currentProjectId, currentProject, updateProjectInList, message, t],
  );

  const handleDeleteCurrentProject = useCallback(() => {
    if (!currentProject || isCurrentProjectLocked) return;
    setIsDeleteModalOpen(true);
  }, [currentProject, isCurrentProjectLocked]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!currentProject) return;
    setIsDeleteSubmitting(true);
    try {
      await deleteProjectApi(currentProject.id);
      removeProject(currentProject.id);
      message.success(t('messages.projectDeleted'), 5);
      setIsDeleteModalOpen(false);
      navigate(ROUTES.PROJECTS);
    } catch {
      message.error(t('messages.projectDeleteFailed'));
    } finally {
      setIsDeleteSubmitting(false);
    }
  }, [currentProject, removeProject, message, t, navigate]);

  const handleDeleteCancel = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const isSaveDisabled =
    !selectedCountryId || isCurrentProjectLocked || (!!currentProjectId && !hasUnsavedChanges);

  const saveButtonText = useMemo(() => {
    if (isFreePlan && !isLoggedIn) return t('visualizer.saveLoginToSave');
    return currentProjectId ? t('visualizer.save') : t('visualizer.saveAs');
  }, [isFreePlan, isLoggedIn, currentProjectId, t]);

  const exportButtonText = t('visualizer.export');

  const embedButtonText = useMemo(
    () => (isLoggedIn ? t('visualizer.embed.openButton') : t('visualizer.loginToExport')),
    [isLoggedIn, t],
  );

  return {
    selectedCountryId,
    currentProjectId,
    currentProject,
    isCurrentProjectLocked,
    hasUnsavedChanges,
    isLoggedIn,
    canUseEmbed,
    isExportModalOpen,
    isEmbedModalOpen,
    isSaving,
    isNameModalOpen,
    projectName,
    isRenameModalOpen,
    isRenameSubmitting,
    isSaveDisabled,
    saveButtonText,
    exportButtonText,
    embedButtonText,
    saveCurrentProject,
    handleOpenExportModal,
    handleCloseExportModal,
    handleOpenEmbedModal,
    handleCloseEmbedModal,
    handleSave,
    handleCreateProject,
    handleNameModalCancel,
    handleNameChange,
    handleOpenRenameModal,
    handleRenameModalCancel,
    handleRenameModalConfirm,
    handleDeleteCurrentProject,
    isDeleteModalOpen,
    isDeleteSubmitting,
    handleDeleteConfirm,
    handleDeleteCancel,
  };
}
