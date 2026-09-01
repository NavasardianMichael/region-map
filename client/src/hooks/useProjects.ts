import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROJECTS_BULK_DELETE_MAX_IDS } from '@regionify/shared';
import {
  deleteProject as deleteProjectApi,
  deleteProjectsBulk as deleteProjectsBulkApi,
  getProjects,
  updateProject as updateProjectApi,
} from '@/api/projects';
import type { Project } from '@/api/projects/types';
import { selectIsLoggedIn, selectLogout } from '@/store/profile/selectors';
import { useProfileStore } from '@/store/profile/store';
import {
  selectProjects,
  selectProjectsStatus,
  selectRemoveProject,
  selectRemoveProjects,
  selectSetProjects,
  selectSetProjectsStatus,
  selectUpdateProjectInList,
} from '@/store/projects/selectors';
import { useProjectsStore } from '@/store/projects/store';
import { useDebounceValue } from '@/hooks/useDebounce';
import { IDLE_STATUSES, type IdleStatus } from '@/constants/loadingStatus';
import { ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { getErrorCode } from '@/helpers/error';
import { getLocalizedRegionLabel, getRegionDisplayName } from '@/helpers/regionDisplay';
import { useAppFeedback } from '@/components/shared/useAppFeedback';

export type ProjectsSortOption =
  | 'updated_desc'
  | 'updated_asc'
  | 'created_desc'
  | 'created_asc'
  | 'name_asc'
  | 'name_desc';

type UseProjectsReturn = {
  projects: Project[];
  filteredProjects: Project[];
  displayedProjects: Project[];
  projectsStatus: IdleStatus;
  isLoggedIn: boolean;
  search: string;
  sortOption: ProjectsSortOption;
  setSortOption: (value: ProjectsSortOption) => void;
  renamingProject: Project | null;
  deletingProject: Project | null;
  deletingProjectsBulk: Project[] | null;
  isDeleting: boolean;
  isBulkDeleting: boolean;
  selectedProjectIds: ReadonlySet<string>;
  selectedCount: number;
  isProjectSelected: (id: string) => boolean;
  isSelectAllChecked: boolean;
  isSelectAllIndeterminate: boolean;
  setSearch: (value: string) => void;
  toggleProjectSelected: (id: string) => void;
  selectAllVisible: (checked: boolean) => void;
  clearSelection: () => void;
  isSelectionCapReached: boolean;
  handleDelete: (project: Project) => void;
  handleDeleteConfirm: () => Promise<void>;
  handleDeleteCancel: () => void;
  handleBulkDelete: () => void;
  handleBulkDeleteConfirm: () => Promise<void>;
  handleBulkDeleteCancel: () => void;
  handleRenameStart: (project: Project) => void;
  handleRenameConfirm: (trimmedName: string) => Promise<void>;
  handleRenameCancel: () => void;
};

export const useProjects = (): UseProjectsReturn => {
  const { t, i18n } = useTypedTranslation();
  const { message } = useAppFeedback();
  const navigate = useNavigate();
  const isLoggedIn = useProfileStore(selectIsLoggedIn);
  const logout = useProfileStore(selectLogout);
  const projects = useProjectsStore(selectProjects);
  const projectsStatus = useProjectsStore(selectProjectsStatus);
  const setProjects = useProjectsStore(selectSetProjects);
  const setProjectsStatus = useProjectsStore(selectSetProjectsStatus);
  const removeProject = useProjectsStore(selectRemoveProject);
  const removeProjects = useProjectsStore(selectRemoveProjects);
  const updateProjectInList = useProjectsStore(selectUpdateProjectInList);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounceValue(search, 300);
  const [sortOption, setSortOption] = useState<ProjectsSortOption>('updated_desc');
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deletingProjectsBulk, setDeletingProjectsBulk] = useState<Project[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(() => new Set());

  /** Guests never fetch; keep list empty and use success so the projects UI can render (empty state + new project). */
  useLayoutEffect(() => {
    if (isLoggedIn) return;
    setProjects([]);
    setProjectsStatus(IDLE_STATUSES.success);
  }, [isLoggedIn, setProjects, setProjectsStatus]);

  const loadProjects = useCallback(async () => {
    setProjectsStatus(IDLE_STATUSES.pending);
    try {
      const data = await getProjects();
      setProjects(data);
      setProjectsStatus(IDLE_STATUSES.success);
    } catch (error) {
      if (getErrorCode(error) === 'UNAUTHORIZED') {
        logout();
        message.error(t('messages.sessionExpired'));
        navigate(ROUTES.LOGIN);
      } else {
        message.error(t('messages.projectsLoadFailed'));
      }
      setProjectsStatus(IDLE_STATUSES.error);
    }
  }, [setProjects, setProjectsStatus, message, t, logout, navigate]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadProjects();
  }, [isLoggedIn, loadProjects]);

  const filteredProjects = useMemo(() => {
    if (!debouncedSearch.trim()) return projects;
    const query = debouncedSearch.toLowerCase();
    const dateLocale = i18n.resolvedLanguage ?? i18n.language;
    return projects.filter((p) => {
      if (p.name.toLowerCase().includes(query)) return true;
      if (p.countryId?.toLowerCase().includes(query)) return true;
      if (!p.countryId) return false;
      const localized = getLocalizedRegionLabel(p.countryId, dateLocale)?.toLowerCase() ?? '';
      const english = getRegionDisplayName(p.countryId)?.toLowerCase() ?? '';
      return localized.includes(query) || english.includes(query);
    });
  }, [projects, debouncedSearch, i18n.language, i18n.resolvedLanguage]);

  const displayedProjects = useMemo(() => {
    const list = [...filteredProjects];
    const locale = i18n.resolvedLanguage ?? i18n.language;
    const compareIso = (a: string, b: string): number =>
      new Date(a).getTime() - new Date(b).getTime();

    list.sort((pa, pb) => {
      switch (sortOption) {
        case 'updated_desc':
          return compareIso(pb.updatedAt, pa.updatedAt);
        case 'updated_asc':
          return compareIso(pa.updatedAt, pb.updatedAt);
        case 'created_desc':
          return compareIso(pb.createdAt, pa.createdAt);
        case 'created_asc':
          return compareIso(pa.createdAt, pb.createdAt);
        case 'name_asc':
          return pa.name.localeCompare(pb.name, locale);
        case 'name_desc':
          return pb.name.localeCompare(pa.name, locale);
        default:
          return 0;
      }
    });
    return list;
  }, [filteredProjects, sortOption, i18n.resolvedLanguage, i18n.language]);

  const visibleIdSet = useMemo(
    () => new Set(displayedProjects.map((p) => p.id)),
    [displayedProjects],
  );

  useEffect(() => {
    setSelectedProjectIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visibleIdSet.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [visibleIdSet]);

  const selectedCount = selectedProjectIds.size;

  const capSliceIds = useMemo(
    () => displayedProjects.slice(0, PROJECTS_BULK_DELETE_MAX_IDS).map((p) => p.id),
    [displayedProjects],
  );

  const isSelectAllChecked = useMemo(() => {
    if (capSliceIds.length === 0) return false;
    return capSliceIds.every((id) => selectedProjectIds.has(id));
  }, [capSliceIds, selectedProjectIds]);

  const isSelectAllIndeterminate = useMemo(() => {
    if (selectedCount === 0) return false;
    return !isSelectAllChecked;
  }, [selectedCount, isSelectAllChecked]);

  const isSelectionCapReached = selectedCount >= PROJECTS_BULK_DELETE_MAX_IDS;

  const isProjectSelected = useCallback(
    (id: string) => selectedProjectIds.has(id),
    [selectedProjectIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedProjectIds(new Set());
  }, []);

  const toggleProjectSelected = useCallback(
    (id: string) => {
      setSelectedProjectIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          return next;
        }
        if (next.size >= PROJECTS_BULK_DELETE_MAX_IDS) {
          message.info(t('projects.bulkSelectMaxReached', { max: PROJECTS_BULK_DELETE_MAX_IDS }));
          return prev;
        }
        next.add(id);
        return next;
      });
    },
    [message, t],
  );

  const selectAllVisible = useCallback(
    (checked: boolean) => {
      if (!checked) {
        clearSelection();
        return;
      }
      const ids = displayedProjects.slice(0, PROJECTS_BULK_DELETE_MAX_IDS).map((p) => p.id);
      setSelectedProjectIds(new Set(ids));
      if (displayedProjects.length > PROJECTS_BULK_DELETE_MAX_IDS) {
        message.info(t('projects.bulkSelectTruncated', { max: PROJECTS_BULK_DELETE_MAX_IDS }), 4);
      }
    },
    [clearSelection, displayedProjects, message, t],
  );

  const handleDelete = useCallback((project: Project) => {
    setDeletingProjectsBulk(null);
    setDeletingProject(project);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingProject) return;
    const deletedId = deletingProject.id;
    setIsDeleting(true);
    try {
      await deleteProjectApi(deletedId);
      removeProject(deletedId);
      message.success(t('messages.projectDeleted'), 5);
      setDeletingProject(null);
      setSelectedProjectIds((prev) => {
        if (!prev.has(deletedId)) return prev;
        const next = new Set(prev);
        next.delete(deletedId);
        return next;
      });
    } catch {
      message.error(t('messages.projectDeleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  }, [deletingProject, removeProject, message, t]);

  const handleDeleteCancel = useCallback(() => {
    setDeletingProject(null);
  }, []);

  const selectedProjectsForBulk = useMemo(
    () => displayedProjects.filter((p) => selectedProjectIds.has(p.id)),
    [displayedProjects, selectedProjectIds],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedProjectsForBulk.length === 0) return;
    setDeletingProject(null);
    setDeletingProjectsBulk(selectedProjectsForBulk);
  }, [selectedProjectsForBulk]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!deletingProjectsBulk?.length) return;
    const ids = deletingProjectsBulk.map((p) => p.id);
    setIsBulkDeleting(true);
    try {
      const { deletedCount } = await deleteProjectsBulkApi(ids);
      setDeletingProjectsBulk(null);
      clearSelection();

      // The server skips projects locked since this list was loaded, so trust its count
      // and resync rather than optimistically dropping rows that still exist.
      if (deletedCount < ids.length) {
        message.warning(t('messages.projectsBulkDeletePartial', { count: deletedCount }), 5);
        await loadProjects();
        return;
      }

      removeProjects(ids);
      message.success(t('messages.projectsBulkDeleted', { count: deletedCount }), 5);
    } catch (error) {
      if (getErrorCode(error) === 'UNAUTHORIZED') {
        logout();
        message.error(t('messages.sessionExpired'));
        navigate(ROUTES.LOGIN);
      } else {
        message.error(t('messages.projectsBulkDeleteFailed'));
      }
    } finally {
      setIsBulkDeleting(false);
    }
  }, [
    deletingProjectsBulk,
    removeProjects,
    message,
    t,
    clearSelection,
    logout,
    navigate,
    loadProjects,
  ]);

  const handleBulkDeleteCancel = useCallback(() => {
    setDeletingProjectsBulk(null);
  }, []);

  const handleRenameStart = useCallback((project: Project) => {
    setRenamingProject(project);
  }, []);

  const handleRenameConfirm = useCallback(
    async (trimmed: string) => {
      if (!renamingProject) return;
      try {
        const updated = await updateProjectApi(renamingProject.id, { name: trimmed });
        updateProjectInList(updated);
        message.success(t('messages.projectRenamed'), 5);
      } catch {
        message.error(t('messages.projectRenameFailed'));
      }
      setRenamingProject(null);
    },
    [renamingProject, updateProjectInList, message, t],
  );

  const handleRenameCancel = useCallback(() => {
    setRenamingProject(null);
  }, []);

  return {
    projects,
    filteredProjects,
    displayedProjects,
    projectsStatus,
    isLoggedIn,
    search,
    sortOption,
    setSortOption,
    renamingProject,
    deletingProject,
    deletingProjectsBulk,
    isDeleting,
    isBulkDeleting,
    selectedProjectIds,
    selectedCount,
    isProjectSelected,
    isSelectAllChecked,
    isSelectAllIndeterminate,
    setSearch,
    toggleProjectSelected,
    selectAllVisible,
    clearSelection,
    isSelectionCapReached,
    handleDelete,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleBulkDelete,
    handleBulkDeleteConfirm,
    handleBulkDeleteCancel,
    handleRenameStart,
    handleRenameConfirm,
    handleRenameCancel,
  };
};
