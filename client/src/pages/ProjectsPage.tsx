import {
  type FC,
  lazy,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { BADGE_DETAILS, PROJECTS_BULK_DELETE_MAX_IDS } from '@regionify/shared';
import {
  Button,
  Checkbox,
  Empty,
  Flex,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import type { Project } from '@/api/projects/types';
import { selectUser } from '@/store/profile/selectors';
import { useProfileStore } from '@/store/profile/store';
import { useLoadProject } from '@/hooks/useLoadProject';
import { useProjectLock } from '@/hooks/useProjectLock';
import { type ProjectsSortOption, useProjects } from '@/hooks/useProjects';
import { IDLE_STATUSES } from '@/constants/loadingStatus';
import { getProjectRoute, ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { clearReturnUrl, clearTemporaryProjectState } from '@/helpers/temporaryProjectState';
import { ProjectCard } from '@/components/projects/ProjectCard';

const RenameProjectModal = lazy(() =>
  import('@/components/projects/RenameProjectModal/Modal').then((m) => ({
    default: m.RenameProjectModal,
  })),
);
const DeleteProjectModal = lazy(() =>
  import('@/components/projects/DeleteProjectModal/Modal').then((m) => ({
    default: m.DeleteProjectModal,
  })),
);
const ProjectLockModal = lazy(() =>
  import('@/components/projects/ProjectLockModal/Modal').then((m) => ({
    default: m.ProjectLockModal,
  })),
);

const ProjectsPage: FC = () => {
  const { t } = useTypedTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const loadProject = useLoadProject();
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const user = useProfileStore(selectUser);
  const {
    projects,
    filteredProjects,
    displayedProjects,
    projectsStatus,
    search,
    sortOption,
    setSortOption,
    renamingProject,
    deletingProject,
    deletingProjectsBulk,
    isDeleting,
    isBulkDeleting,
    isSelectAllChecked,
    isSelectAllIndeterminate,
    setSearch,
    toggleProjectSelected,
    selectAllVisible,
    isProjectSelected,
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
    selectedCount,
  } = useProjects();
  const {
    pendingProject: lockPendingProject,
    isSubmitting: isLockSubmitting,
    requestToggle: handleToggleLock,
    handleConfirm: handleLockConfirm,
    handleCancel: handleLockCancel,
  } = useProjectLock();

  useEffect(() => {
    void import('@/pages/VisualizerPage');
  }, []);

  useEffect(() => {
    const path = location.pathname;
    const onSavedProjectRoute =
      path.startsWith('/projects/') &&
      path !== ROUTES.PROJECT_NEW &&
      path !== ROUTES.PROJECT_EDITOR;
    if (onSavedProjectRoute) {
      setOpeningProjectId(null);
    }
  }, [location.pathname]);

  const handleOpen = useCallback(
    (project: Project) => {
      setOpeningProjectId(project.id);
      requestAnimationFrame(() => {
        loadProject(project);
        startTransition(() => {
          navigate(getProjectRoute(project.id));
        });
      });
    },
    [loadProject, navigate],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch],
  );

  const handleNewProject = useCallback(() => {
    const limit = user ? BADGE_DETAILS[user.badge].limits.maxProjectsCount : null;
    if (limit !== null && projects.length >= limit) {
      Modal.warning({
        title: t('projects.limitReachedTitle'),
        content: t('projects.limitReachedContent', { count: limit }),
      });
      return;
    }
    clearTemporaryProjectState();
    clearReturnUrl();
    navigate(ROUTES.PROJECT_NEW);
  }, [navigate, projects.length, user, t]);

  const handleDeleteModalConfirm = useCallback(async () => {
    if (deletingProjectsBulk != null && deletingProjectsBulk.length > 0) {
      await handleBulkDeleteConfirm();
    } else {
      await handleDeleteConfirm();
    }
  }, [deletingProjectsBulk, handleBulkDeleteConfirm, handleDeleteConfirm]);

  const handleDeleteModalCancel = useCallback(() => {
    if (deletingProjectsBulk != null && deletingProjectsBulk.length > 0) {
      handleBulkDeleteCancel();
    } else {
      handleDeleteCancel();
    }
  }, [deletingProjectsBulk, handleBulkDeleteCancel, handleDeleteCancel]);

  const sortSelectOptions = useMemo(
    () =>
      (
        [
          ['updated_desc', 'projects.sortUpdatedDesc'],
          ['updated_asc', 'projects.sortUpdatedAsc'],
          ['created_desc', 'projects.sortCreatedDesc'],
          ['created_asc', 'projects.sortCreatedAsc'],
          ['name_asc', 'projects.sortNameAsc'],
          ['name_desc', 'projects.sortNameDesc'],
        ] as const
      ).map(([value, labelKey]) => ({
        value: value as ProjectsSortOption,
        label: t(labelKey),
      })),
    [t],
  );

  return (
    <>
      <Flex vertical className="mx-auto h-full w-full" gap="middle">
        {projectsStatus !== IDLE_STATUSES.idle ? (
          <>
            <Typography.Title
              level={2}
              className="text-primary mb-0! text-xl font-bold"
              data-i18n-key="projects.title"
            >
              {t('projects.title')}
            </Typography.Title>
            {projects.length > 0 ? (
              <Flex align="center" justify="space-between" wrap="wrap" gap="middle">
                <Flex align="center" wrap="wrap" gap="small">
                  <Checkbox
                    checked={isSelectAllChecked}
                    indeterminate={isSelectAllIndeterminate}
                    disabled={displayedProjects.length === 0}
                    onChange={(e) => {
                      selectAllVisible(e.target.checked);
                    }}
                    data-i18n-key="projects.selectAll"
                  >
                    {t('projects.selectAll')}
                  </Checkbox>
                  <Select<ProjectsSortOption>
                    value={sortOption}
                    onChange={setSortOption}
                    className="min-w-44"
                    options={sortSelectOptions}
                    disabled={displayedProjects.length === 0}
                    aria-label={t('projects.sortAria')}
                    data-i18n-key="projects.sortAria"
                  />
                  <Button
                    danger
                    type="primary"
                    icon={<DeleteOutlined />}
                    onClick={handleBulkDelete}
                    className={selectedCount > 0 ? '' : 'pointer-events-none invisible'}
                    aria-label={t('projects.deleteSelected')}
                    data-i18n-key="projects.deleteSelected"
                  >
                    <span className="hidden sm:inline">{t('projects.deleteSelected')}</span>
                  </Button>
                </Flex>
                <Flex
                  align="center"
                  className="min-w-0 shrink-0 grow basis-60 justify-end"
                  wrap="wrap"
                >
                  <Space.Compact className="flex w-full max-w-100 min-w-0">
                    <Input.Search
                      placeholder={t('projects.searchPlaceholder')}
                      className="min-w-0 flex-1 basis-0"
                      value={search}
                      onChange={handleSearchChange}
                      allowClear
                      data-i18n-key="projects.searchPlaceholder"
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleNewProject}
                      data-i18n-key="projects.newProject"
                    >
                      {t('projects.newProject')}
                    </Button>
                  </Space.Compact>
                </Flex>
              </Flex>
            ) : null}

            {projectsStatus === IDLE_STATUSES.pending ? (
              <Flex align="center" justify="center" className="flex-1">
                <Spin size="large" />
              </Flex>
            ) : filteredProjects.length === 0 ? (
              <Flex align="center" justify="center" className="flex-1">
                <Empty
                  description={
                    projects.length === 0 ? t('projects.empty') : t('projects.emptyFiltered')
                  }
                >
                  {projects.length === 0 && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleNewProject}
                      data-i18n-key="projects.newProject"
                    >
                      {t('projects.newProject')}
                    </Button>
                  )}
                </Empty>
              </Flex>
            ) : (
              <Flex
                wrap="wrap"
                gap="middle"
                justify="center"
                align="stretch"
                className="pb-md content-start sm:justify-start!"
              >
                {displayedProjects.map((project) => {
                  const selected = isProjectSelected(project.id);
                  const capReached = !selected && isSelectionCapReached;
                  const checkboxDisabled = project.locked || capReached;
                  const card = (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={handleOpen}
                      onDelete={handleDelete}
                      onRename={handleRenameStart}
                      onToggleLock={handleToggleLock}
                      isOpening={openingProjectId === project.id}
                      showSelection
                      isSelected={selected}
                      onToggleSelect={(p) => {
                        toggleProjectSelected(p.id);
                      }}
                      selectionCheckboxDisabled={checkboxDisabled}
                    />
                  );
                  if (!checkboxDisabled) return card;
                  const checkboxTooltip = project.locked
                    ? t('projects.bulkSelectLockedTooltip')
                    : t('projects.bulkSelectCapTooltip', { max: PROJECTS_BULK_DELETE_MAX_IDS });
                  return (
                    <Tooltip key={project.id} title={checkboxTooltip}>
                      {card}
                    </Tooltip>
                  );
                })}
              </Flex>
            )}
          </>
        ) : null}
      </Flex>

      <Suspense>
        <DeleteProjectModal
          project={deletingProject}
          projectsBulk={deletingProjectsBulk}
          onConfirm={handleDeleteModalConfirm}
          onCancel={handleDeleteModalCancel}
          confirmLoading={isDeleting || isBulkDeleting}
        />
      </Suspense>

      {lockPendingProject && (
        <Suspense>
          <ProjectLockModal
            project={lockPendingProject}
            onConfirm={handleLockConfirm}
            onCancel={handleLockCancel}
            confirmLoading={isLockSubmitting}
          />
        </Suspense>
      )}

      {renamingProject && (
        <Suspense>
          <RenameProjectModal
            project={renamingProject}
            onConfirm={handleRenameConfirm}
            onCancel={handleRenameCancel}
          />
        </Suspense>
      )}
    </>
  );
};

export default ProjectsPage;
