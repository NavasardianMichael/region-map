import {
  type CSSProperties,
  type FC,
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  SaveOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import * as Sentry from '@sentry/react';
import {
  Button,
  Divider,
  Flex,
  Radio,
  type RadioChangeEvent,
  Spin,
  Splitter,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import { getProject } from '@/api/projects';
import { selectHasTimelineData } from '@/store/mapData/selectors';
import { useVisualizerStore } from '@/store/mapData/store';
import { selectLogout } from '@/store/profile/selectors';
import { useProfileStore } from '@/store/profile/store';
import {
  selectAddProject,
  selectCurrentProjectId,
  selectSetCurrentProjectId,
  selectSetSavedStateSnapshot,
} from '@/store/projects/selectors';
import { useProjectsStore } from '@/store/projects/store';
import { useGuestDraftAutosave } from '@/hooks/useGuestDraftAutosave';
import { useIsMdUp } from '@/hooks/useIsMdUp';
import { useLoadProject } from '@/hooks/useLoadProject';
import { captureStateSnapshot } from '@/hooks/useProjectState';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useVisualizerPage } from '@/hooks/useVisualizerPage';
import { getProjectRoute, ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import {
  applyFullTemporaryProjectState,
  resetVisualizerToDefaultState,
} from '@/helpers/applyFullTemporaryProjectState';
import {
  clearTemporaryProjectState,
  consumeSkipNewProjectResetOnce,
  isGuestSnapshotExpired,
  mergeTemporaryStateWithDefaults,
  readGuestProjectSnapshotEnvelope,
  saveReturnUrl,
} from '@/helpers/temporaryProjectState';
import { useAppFeedback } from '@/components/shared/useAppFeedback';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { CardLayout } from '@/components/visualizer/CardLayout';
import GeneralStylesPack from '@/components/visualizer/GeneralStylesPack';
import ImportDataPanel from '@/components/visualizer/ImportDataPanel/ImportDataPanel';
import LegendConfigPanel from '@/components/visualizer/LegendConfigPanel';
import LegendStylesPanel from '@/components/visualizer/LegendStylesPanel';
import MapStylesPanel from '@/components/visualizer/MapStylesPanel';
import MapViewer from '@/components/visualizer/MapViewer';
import { RegionSelect } from '@/components/visualizer/RegionSelect';

const ExportMapModal = lazy(() =>
  import('@/components/visualizer/ExportMapModal/Modal').then((m) => ({
    default: m.ExportMapModal,
  })),
);
const ProjectEmbedModal = lazy(() => import('@/components/visualizer/ProjectEmbedModal/Modal'));
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
const SaveProjectNameModal = lazy(() =>
  import('@/components/projects/SaveProjectNameModal/Modal').then((m) => ({
    default: m.SaveProjectNameModal,
  })),
);
const UnsavedChangesModal = lazy(() =>
  import('@/components/shared/UnsavedChangesModal').then((m) => ({
    default: m.UnsavedChangesModal,
  })),
);
const AnimationControls = lazy(() => import('@/components/visualizer/AnimationControls'));

type MobileVisualizerSection = 'map' | 'data' | 'styles';

const VisualizerPage: FC = () => {
  const { token } = theme.useToken();
  const { t } = useTypedTranslation();
  const { message } = useAppFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const logout = useProfileStore(selectLogout);
  useGuestDraftAutosave();
  const currentProjectId = useProjectsStore(selectCurrentProjectId);
  const setCurrentProjectId = useProjectsStore(selectSetCurrentProjectId);
  const setSavedStateSnapshot = useProjectsStore(selectSetSavedStateSnapshot);
  const addProjectToStore = useProjectsStore(selectAddProject);
  const hasTimelineData = useVisualizerStore(selectHasTimelineData);
  const loadProject = useLoadProject();
  const isMdUp = useIsMdUp();
  const [mobileSection, setMobileSection] = useState<MobileVisualizerSection>('map');

  /** Saved project in URL but store not hydrated yet (no flash of placeholder copy / default legend). */
  const isAwaitingProjectFromUrl =
    urlProjectId != null && urlProjectId !== 'new' && currentProjectId === null;

  const {
    selectedCountryId,
    currentProjectId: visualizerProjectId,
    hasUnsavedChanges,
    isExportModalOpen,
    isEmbedModalOpen,
    isLoggedIn,
    canUseEmbed,
    isSaving,
    isNameModalOpen,
    currentProject,
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
  } = useVisualizerPage();

  const unsavedGuard = useUnsavedChangesGuard({
    hasUnsavedChanges: isLoggedIn && visualizerProjectId !== null && hasUnsavedChanges,
    onSave: saveCurrentProject,
  });

  const embedButtonDisabled =
    !canUseEmbed || !selectedCountryId || !currentProject || isAwaitingProjectFromUrl;

  const embedTooltipTitle = useMemo(() => {
    if (!embedButtonDisabled) return undefined;
    if (!canUseEmbed) {
      const onTooltip = token.colorTextLightSolid;
      const linkStyle: CSSProperties = {
        color: onTooltip,
        textDecoration: 'underline',
        textDecorationThickness: 'from-font',
        textUnderlineOffset: 4,
        fontWeight: 600,
      };
      return (
        <Flex vertical gap="small">
          <Typography.Text
            className="text-sm text-balance"
            style={{ color: onTooltip }}
            data-i18n-key="visualizer.embed.tooltipChronographerBody"
          >
            {t('visualizer.embed.tooltipChronographerBody', {
              badgeName: t('badges.items.chronographer.name'),
            })}
          </Typography.Text>
          <Link
            to={ROUTES.BILLING}
            className="text-sm"
            style={linkStyle}
            data-i18n-key="visualizer.embed.upgradeBadgesLink"
          >
            {t('visualizer.embed.upgradeBadgesLink')}
          </Link>
        </Flex>
      );
    }
    if (!currentProject) return t('visualizer.embed.tooltipNeedSavedProject');
    if (!selectedCountryId) return t('visualizer.embed.tooltipSelectCountry');
    return undefined;
  }, [
    embedButtonDisabled,
    canUseEmbed,
    currentProject,
    selectedCountryId,
    t,
    token.colorTextLightSolid,
  ]);

  const embedButton = (
    <Button
      icon={<ShareAltOutlined />}
      type="primary"
      onClick={handleOpenEmbedModal}
      disabled={embedButtonDisabled}
      loading={isSaving}
      data-i18n-key="visualizer.embed.openButton"
    >
      {embedButtonText}
    </Button>
  );

  useEffect(() => {
    if (location.pathname === ROUTES.PROJECT_NEW) {
      return;
    }
    if (currentProjectId && urlProjectId !== undefined && urlProjectId !== currentProjectId) {
      navigate(getProjectRoute(currentProjectId), { replace: true });
    }
  }, [currentProjectId, urlProjectId, navigate, location.pathname]);

  useEffect(() => {
    if (location.pathname === ROUTES.PROJECT_NEW) return;
    if (!urlProjectId || urlProjectId === 'new') return;
    if (currentProjectId !== null) return;

    let cancelled = false;
    const run = async () => {
      try {
        const project = await getProject(urlProjectId);
        if (cancelled) return;
        loadProject(project);
        if (!useProjectsStore.getState().projects.some((p) => p.id === project.id)) {
          addProjectToStore(project);
        }
      } catch (error) {
        if (cancelled) return;
        const err = error as Error & { code?: string };
        if (err.code === 'UNAUTHORIZED') {
          saveReturnUrl(`${location.pathname}${location.search}`);
          logout();
          message.error(t('messages.sessionExpired'));
          navigate(ROUTES.LOGIN);
        } else {
          message.error(t('messages.projectLoadFailed'));
          navigate(ROUTES.PROJECTS);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    urlProjectId,
    currentProjectId,
    location.pathname,
    location.search,
    loadProject,
    addProjectToStore,
    logout,
    message,
    navigate,
    t,
  ]);

  // Run before child useEffects (e.g. ImportDataPanel async region loader) so the store is cleared first.
  useLayoutEffect(() => {
    if (location.pathname !== ROUTES.PROJECT_NEW) return;

    if (consumeSkipNewProjectResetOnce()) {
      setCurrentProjectId(null);
      requestAnimationFrame(() => {
        setSavedStateSnapshot(captureStateSnapshot());
      });
      return;
    }

    const loggedIn = useProfileStore.getState().isLoggedIn;
    if (loggedIn) {
      resetVisualizerToDefaultState();
      clearTemporaryProjectState();
      setCurrentProjectId(null);
      requestAnimationFrame(() => {
        setSavedStateSnapshot(captureStateSnapshot());
      });
      return;
    }

    const envelope = readGuestProjectSnapshotEnvelope();
    if (envelope && !isGuestSnapshotExpired(envelope)) {
      applyFullTemporaryProjectState(mergeTemporaryStateWithDefaults(envelope.partial));
    } else {
      if (envelope) clearTemporaryProjectState();
      resetVisualizerToDefaultState();
    }
    setCurrentProjectId(null);
    requestAnimationFrame(() => {
      setSavedStateSnapshot(captureStateSnapshot());
    });
  }, [location.pathname, setCurrentProjectId, setSavedStateSnapshot]);

  const sidePanelLoading = (
    <CardLayout component="aside" vertical className="h-full">
      <Flex align="center" justify="center" className="min-h-48 flex-1">
        <Spin size="large" />
      </Flex>
    </CardLayout>
  );

  const dataPanel = isAwaitingProjectFromUrl ? (
    sidePanelLoading
  ) : (
    <CardLayout component="aside" vertical className="h-full">
      {isMdUp ? (
        <>
          <RegionSelect />
          <Divider />
        </>
      ) : null}
      <ImportDataPanel />
      <Divider />
      <LegendConfigPanel />
    </CardLayout>
  );

  const mapPanel = (
    <CardLayout className="min-h-md gap-md h-full">
      {!isMdUp && !isAwaitingProjectFromUrl ? (
        <>
          <RegionSelect />
          <Divider className="m-0! shrink-0" />
        </>
      ) : null}
      <Flex align="center" justify="space-between" wrap className="mb-sm shrink-0" gap="middle">
        <Flex align="center" gap="small" className="min-w-0">
          {!isAwaitingProjectFromUrl ? (
            <Typography.Title
              level={3}
              className="text-primary mb-0! min-w-0 flex-1 truncate text-base font-semibold"
              data-i18n-key="visualizer.mapAreaTitle"
            >
              {currentProject?.name?.trim() ? currentProject.name : t('visualizer.mapAreaTitle')}
            </Typography.Title>
          ) : (
            <span className="min-h-9 min-w-0 flex-1 shrink-0" aria-hidden />
          )}
          {isLoggedIn && currentProject && !isAwaitingProjectFromUrl ? (
            <Flex gap={0} className="shrink-0">
              <Tooltip
                title={t('visualizer.mapHeaderRenameTooltip')}
                data-i18n-key="visualizer.mapHeaderRenameTooltip"
              >
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={handleOpenRenameModal}
                  aria-label={t('visualizer.mapHeaderRenameTooltip')}
                  data-i18n-key="visualizer.mapHeaderRenameTooltip"
                />
              </Tooltip>
              <Tooltip
                title={t('visualizer.mapHeaderDeleteTooltip')}
                data-i18n-key="visualizer.mapHeaderDeleteTooltip"
              >
                <Button
                  type="text"
                  // danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteCurrentProject}
                  aria-label={t('visualizer.mapHeaderDeleteTooltip')}
                  data-i18n-key="visualizer.mapHeaderDeleteTooltip"
                />
              </Tooltip>
            </Flex>
          ) : null}
        </Flex>
        <Flex gap="small" wrap="wrap">
          <Button
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={isSaveDisabled || isAwaitingProjectFromUrl}
            loading={isSaving}
            data-i18n-key="visualizer.save"
          >
            {saveButtonText}
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleOpenExportModal}
            disabled={!selectedCountryId || isAwaitingProjectFromUrl}
            data-i18n-key="visualizer.export"
          >
            {exportButtonText}
          </Button>
          {isLoggedIn ? (
            embedButtonDisabled ? (
              <Tooltip
                title={embedTooltipTitle}
                data-i18n-key="visualizer.embed.tooltipNeedSavedProject"
              >
                <span className="inline-flex">{embedButton}</span>
              </Tooltip>
            ) : (
              embedButton
            )
          ) : null}
        </Flex>
      </Flex>
      {!isAwaitingProjectFromUrl && hasTimelineData && (
        <Suspense>
          <AnimationControls />
        </Suspense>
      )}
      {isAwaitingProjectFromUrl ? (
        <Flex align="center" justify="center" className="min-h-0 flex-1">
          <Spin size="large" />
        </Flex>
      ) : (
        <Suspense fallback={<Spin className="m-auto flex-1" />}>
          <Sentry.ErrorBoundary fallback={<ErrorFallback title={t('errors.mapRenderFailed')} />}>
            <MapViewer
              className="min-h-0 flex-1"
              showBadgeRibbon={isLoggedIn && !isAwaitingProjectFromUrl}
            />
          </Sentry.ErrorBoundary>
        </Suspense>
      )}
    </CardLayout>
  );

  const stylesPanel = isAwaitingProjectFromUrl ? (
    sidePanelLoading
  ) : (
    <CardLayout component="aside" vertical className="h-full">
      <MapStylesPanel />
      <Divider />
      <LegendStylesPanel />
      <Divider />
      <GeneralStylesPack />
    </CardLayout>
  );

  return (
    <>
      {isMdUp ? (
        <Splitter orientation="horizontal" className="h-full min-h-0 w-full">
          <Splitter.Panel
            defaultSize="25%"
            min="15%"
            max="40%"
            collapsible={{ start: true, end: true, showCollapsibleIcon: true }}
          >
            {dataPanel}
          </Splitter.Panel>
          <Splitter.Panel>{mapPanel}</Splitter.Panel>
          <Splitter.Panel
            defaultSize="25%"
            min="15%"
            max="35%"
            collapsible={{ start: true, end: false, showCollapsibleIcon: true }}
          >
            {stylesPanel}
          </Splitter.Panel>
        </Splitter>
      ) : (
        <Flex vertical gap={8} className="h-full min-h-0 w-full min-w-0 flex-1">
          <Radio.Group
            value={mobileSection}
            optionType="button"
            buttonStyle="solid"
            block
            className="shrink-0 [&_.ant-radio-button-wrapper]:flex-1 [&_.ant-radio-button-wrapper]:basis-0 [&_.ant-radio-button-wrapper]:px-2! [&_.ant-radio-button-wrapper]:text-center! [&_.ant-radio-button-wrapper]:first:rounded-s-md [&_.ant-radio-button-wrapper]:last:rounded-e-md"
            onChange={(e: RadioChangeEvent) => {
              setMobileSection(e.target.value as MobileVisualizerSection);
            }}
          >
            <Radio.Button value="map" data-i18n-key="visualizer.tabMap">
              {t('visualizer.tabMap')}
            </Radio.Button>
            <Radio.Button value="data" data-i18n-key="visualizer.tabData">
              {t('visualizer.tabData')}
            </Radio.Button>
            <Radio.Button value="styles" data-i18n-key="visualizer.tabStyles">
              {t('visualizer.tabStyles')}
            </Radio.Button>
          </Radio.Group>
          <div className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden">
            {/*
              Use native div + Tailwind for show/hide — antd Flex adds `display: flex` with
              stylesheet order that can override `hidden`, so inactive panels stayed visible on mobile.
            */}
            <div
              className={mobileSection === 'map' ? 'flex h-full min-h-0 w-full flex-col' : 'hidden'}
              aria-hidden={mobileSection !== 'map'}
            >
              {mapPanel}
            </div>
            <div
              className={
                mobileSection === 'data' ? 'flex h-full min-h-0 w-full flex-col' : 'hidden'
              }
              aria-hidden={mobileSection !== 'data'}
            >
              {dataPanel}
            </div>
            <div
              className={
                mobileSection === 'styles' ? 'flex h-full min-h-0 w-full flex-col' : 'hidden'
              }
              aria-hidden={mobileSection !== 'styles'}
            >
              {stylesPanel}
            </div>
          </div>
        </Flex>
      )}

      {isExportModalOpen && (
        <Suspense>
          <ExportMapModal open={isExportModalOpen} onClose={handleCloseExportModal} />
        </Suspense>
      )}

      {isEmbedModalOpen && currentProject && canUseEmbed && (
        <Suspense>
          <ProjectEmbedModal
            open={isEmbedModalOpen}
            onClose={handleCloseEmbedModal}
            project={currentProject}
          />
        </Suspense>
      )}

      {isRenameModalOpen && currentProject ? (
        <Suspense>
          <RenameProjectModal
            project={currentProject}
            onConfirm={handleRenameModalConfirm}
            onCancel={handleRenameModalCancel}
            confirmLoading={isRenameSubmitting}
          />
        </Suspense>
      ) : null}

      <Suspense>
        <DeleteProjectModal
          project={isDeleteModalOpen ? currentProject : null}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          confirmLoading={isDeleteSubmitting}
        />
      </Suspense>

      {isNameModalOpen && (
        <Suspense>
          <SaveProjectNameModal
            open={isNameModalOpen}
            title={t('visualizer.saveModalTitle')}
            prompt={t('visualizer.saveModalPrompt')}
            placeholder={t('visualizer.saveModalPlaceholder')}
            okText={t('visualizer.saveModalCreate')}
            projectName={projectName}
            okDisabled={!projectName.trim()}
            onProjectNameChange={handleNameChange}
            onOk={handleCreateProject}
            onCancel={handleNameModalCancel}
          />
        </Suspense>
      )}

      {unsavedGuard.isModalOpen && (
        <Suspense>
          <UnsavedChangesModal
            open={unsavedGuard.isModalOpen}
            canSave={visualizerProjectId !== null}
            isSaving={unsavedGuard.isSaving}
            onDiscard={unsavedGuard.handleDiscard}
            onSaveAndLeave={unsavedGuard.handleSaveAndLeave}
            onCancel={unsavedGuard.handleCancel}
          />
        </Suspense>
      )}
    </>
  );
};

export default VisualizerPage;
