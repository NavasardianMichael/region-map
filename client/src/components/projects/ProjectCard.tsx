import { memo, type ReactNode, useCallback, useMemo } from 'react';
import {
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  InsertRowAboveOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Checkbox, Flex, Spin, Tooltip, Typography } from 'antd';
import type { Project } from '@/api/projects/types';
import { useMapThumbnail } from '@/hooks/useMapThumbnail';
import type { ImportDataType } from '@/types/mapData';
import { IMPORT_FORMAT_LABEL_I18N_KEYS, PROJECT_DATE_FORMAT_OPTIONS } from '@/constants/data';
import type { TypedT } from '@/i18n/useTypedTranslation';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { getLocalizedRegionLabel } from '@/helpers/regionDisplay';
import { Card, CardMeta } from '@/components/ui/Card';

type ProjectCardProps = {
  project: Project;
  onOpen: (project: Project) => void;
  onDelete: (project: Project) => void;
  onRename: (project: Project) => void;
  onToggleLock: (project: Project) => void;
  isOpening?: boolean;
  showSelection?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (project: Project) => void;
  selectionCheckboxDisabled?: boolean;
};

type ProjectCardCoverProps = {
  mapThumbnailUrl: string;
  thumbnailAlt: string;
};

const ProjectCardCover = memo<ProjectCardCoverProps>(({ mapThumbnailUrl, thumbnailAlt }) => (
  // Card cover sets direct children to `display:block`, so flex must be forced to center the image.
  <Flex align="center" justify="center" className="flex! h-36 w-full min-w-0 bg-gray-50 px-4">
    <img
      src={mapThumbnailUrl}
      alt={thumbnailAlt}
      className="max-h-30 w-auto max-w-full shrink-0 object-contain"
    />
  </Flex>
));
ProjectCardCover.displayName = 'ProjectCardCover';

const ProjectCardCoverLoading = memo(() => (
  <Flex
    align="center"
    justify="center"
    className="flex! h-36 w-full min-w-0 bg-gray-50 px-4"
    aria-busy
    aria-live="polite"
  >
    <Spin size="large" />
  </Flex>
));
ProjectCardCoverLoading.displayName = 'ProjectCardCoverLoading';

const ProjectCardOpeningOverlay = memo(() => (
  <Flex
    align="center"
    justify="center"
    className="absolute inset-0 z-10 rounded-lg bg-white/40 backdrop-blur-sm"
    aria-busy
    aria-live="polite"
  >
    <Spin size="large" />
  </Flex>
));
ProjectCardOpeningOverlay.displayName = 'ProjectCardOpeningOverlay';

type ProjectCardMetaDescriptionProps = {
  countryLabel: string;
  dataSourceLine: string;
  createdLine: string;
  updatedLine: string;
};

const ProjectCardMetaDescription = memo<ProjectCardMetaDescriptionProps>(
  ({ countryLabel, dataSourceLine, createdLine, updatedLine }) => (
    <Flex vertical gap={4} className="min-w-0">
      <Flex align="center" gap="small" className="min-w-0">
        <GlobalOutlined className="shrink-0 text-xs text-gray-400" aria-hidden />
        <Typography.Text
          type="secondary"
          className="truncate text-xs"
          data-i18n-key="projects.cardNoCountry"
        >
          {countryLabel}
        </Typography.Text>
      </Flex>
      <Flex align="center" gap="small" className="min-w-0">
        <InsertRowAboveOutlined className="shrink-0 text-xs text-gray-400" aria-hidden />
        <Typography.Text
          type="secondary"
          className="truncate text-xs"
          data-i18n-key="projects.dataSource"
        >
          {dataSourceLine}
        </Typography.Text>
      </Flex>
      <Typography.Text type="secondary" className="text-xs" data-i18n-key="projects.cardCreated">
        {createdLine}
      </Typography.Text>
      <Typography.Text type="secondary" className="text-xs" data-i18n-key="projects.cardUpdated">
        {updatedLine}
      </Typography.Text>
    </Flex>
  ),
);
ProjectCardMetaDescription.displayName = 'ProjectCardMetaDescription';

type ProjectCardMetaSectionProps = {
  projectName: string;
  description: ReactNode;
  isLocked: boolean;
  lockedLabel: string;
};

const ProjectCardMetaSection = memo<ProjectCardMetaSectionProps>(
  ({ projectName, description, isLocked, lockedLabel }) => (
    <CardMeta
      className="min-h-0"
      avatar={<Avatar icon={<FolderOpenOutlined aria-hidden />} className="shrink-0" />}
      title={
        <Flex align="center" gap="small" className="min-w-0">
          {isLocked ? (
            <LockOutlined
              className="text-primary shrink-0"
              aria-label={lockedLabel}
              data-i18n-key="projects.lockedTag"
            />
          ) : null}
          <Typography.Text strong className="block truncate text-base">
            {projectName}
          </Typography.Text>
        </Flex>
      }
      description={description}
    />
  ),
);
ProjectCardMetaSection.displayName = 'ProjectCardMetaSection';

type ProjectCardActionButtonProps = {
  onClick: (e: React.MouseEvent) => void;
  icon: ReactNode;
  label: string;
  disabled: boolean;
  danger?: boolean;
  /** Explains why the action is unavailable; also forces the disabled-button wrapper. */
  disabledReason?: string;
};

const ProjectCardActionButton = memo<ProjectCardActionButtonProps>(
  ({ onClick, icon, label, disabled, danger = false, disabledReason }) => {
    const button = (
      <Button type="text" danger={danger} icon={icon} onClick={onClick} disabled={disabled}>
        {label}
      </Button>
    );

    // A disabled antd Button swallows pointer events, so the tooltip needs a live wrapper.
    if (!disabled || !disabledReason) return button;

    return (
      <Tooltip title={disabledReason}>
        <span className="inline-flex">{button}</span>
      </Tooltip>
    );
  },
);
ProjectCardActionButton.displayName = 'ProjectCardActionButton';

function datasetFormatLabel(t: TypedT, importDataType: ImportDataType | null | undefined): string {
  if (importDataType == null) {
    return t('projects.dataSourceNone');
  }
  return t(IMPORT_FORMAT_LABEL_I18N_KEYS[importDataType]);
}

const ProjectCard = memo<ProjectCardProps>(
  ({
    project,
    onOpen,
    onDelete,
    onRename,
    onToggleLock,
    isOpening = false,
    showSelection = false,
    isSelected = false,
    onToggleSelect,
    selectionCheckboxDisabled = false,
  }) => {
    const { t, i18n } = useTypedTranslation();

    const handleOpenClick = useCallback(() => {
      if (isOpening) return;
      onOpen(project);
    }, [isOpening, onOpen, project]);

    const handleDeleteClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(project);
      },
      [onDelete, project],
    );

    const handleRenameClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRename(project);
      },
      [onRename, project],
    );

    const handleLockClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleLock(project);
      },
      [onToggleLock, project],
    );

    const handleSelectionCheckboxChange = useCallback(() => {
      onToggleSelect?.(project);
    }, [onToggleSelect, project]);

    const handleSelectionCheckboxClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    const handleSelectionCheckboxMouseDown = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    const selectAriaLabel = useMemo(
      () => t('projects.selectProjectAria', { name: project.name }),
      [project.name, t],
    );

    const dateLocale = i18n.resolvedLanguage ?? i18n.language;

    const countryLabel = useMemo(() => {
      if (!project.countryId) {
        return t('projects.cardNoCountry');
      }
      return getLocalizedRegionLabel(project.countryId, dateLocale) ?? t('projects.cardNoCountry');
    }, [dateLocale, project.countryId, t]);

    const { url: mapThumbnailUrl, isLoading: isThumbnailLoading } = useMapThumbnail(
      project.countryId,
    );

    const createdDateStr = useMemo(
      () => new Date(project.createdAt).toLocaleDateString(dateLocale, PROJECT_DATE_FORMAT_OPTIONS),
      [dateLocale, project.createdAt],
    );

    const updatedDateStr = useMemo(
      () => new Date(project.updatedAt).toLocaleDateString(dateLocale, PROJECT_DATE_FORMAT_OPTIONS),
      [dateLocale, project.updatedAt],
    );

    const dataSourceLine = useMemo(() => {
      if (!project.dataset) {
        return t('projects.dataSource', { type: t('projects.dataSourceNone') });
      }
      const typeLabel = datasetFormatLabel(t, project.dataset.importDataType);
      return t('projects.dataSource', { type: typeLabel });
    }, [project.dataset, t]);

    const createdLine = useMemo(
      () => t('projects.cardCreated', { date: createdDateStr }),
      [createdDateStr, t],
    );

    const updatedLine = useMemo(
      () => t('projects.cardUpdated', { date: updatedDateStr }),
      [t, updatedDateStr],
    );

    const actions = useMemo(
      () => [
        <ProjectCardActionButton
          key="rename"
          onClick={handleRenameClick}
          icon={<EditOutlined />}
          label={t('common.rename')}
          disabled={isOpening || project.locked}
          disabledReason={project.locked ? t('projects.lockedRenameTooltip') : undefined}
          data-i18n-key="common.rename"
        />,
        <ProjectCardActionButton
          key="lock"
          onClick={handleLockClick}
          icon={project.locked ? <UnlockOutlined /> : <LockOutlined />}
          label={project.locked ? t('projects.unlock') : t('projects.lock')}
          disabled={isOpening}
          data-i18n-key={project.locked ? 'projects.unlock' : 'projects.lock'}
        />,
        <ProjectCardActionButton
          key="delete"
          onClick={handleDeleteClick}
          icon={<DeleteOutlined />}
          label={t('common.delete')}
          danger
          disabled={isOpening || project.locked}
          disabledReason={project.locked ? t('projects.lockedDeleteTooltip') : undefined}
          data-i18n-key="common.delete"
        />,
      ],
      [handleRenameClick, handleLockClick, handleDeleteClick, isOpening, project.locked, t],
    );

    return (
      <div className="relative flex min-h-0 w-full flex-col sm:max-w-80">
        {isOpening && <ProjectCardOpeningOverlay />}
        {showSelection && onToggleSelect ? (
          <span
            className="absolute top-1 right-1 z-20 rounded"
            onMouseDown={handleSelectionCheckboxMouseDown}
            role="presentation"
          >
            <Checkbox
              checked={isSelected}
              disabled={selectionCheckboxDisabled}
              aria-label={selectAriaLabel}
              data-i18n-key="projects.selectProjectAria"
              onChange={handleSelectionCheckboxChange}
              onClick={handleSelectionCheckboxClick}
            />
          </span>
        ) : null}
        <Card
          hoverable
          className="min-h-0 w-full flex-1"
          classNames={{
            root: 'border-gray-300 flex min-h-0 flex-1 flex-col border',
            body: 'flex min-h-0 flex-1 flex-col',
          }}
          cover={
            isThumbnailLoading ? (
              <ProjectCardCoverLoading />
            ) : mapThumbnailUrl ? (
              <ProjectCardCover
                mapThumbnailUrl={mapThumbnailUrl}
                thumbnailAlt={t('projects.cardRegionThumbnailAlt')}
                data-i18n-key="projects.cardRegionThumbnailAlt"
              />
            ) : undefined
          }
          actions={actions}
          onClick={handleOpenClick}
        >
          <ProjectCardMetaSection
            projectName={project.name}
            isLocked={project.locked}
            lockedLabel={t('projects.lockedTag')}
            description={
              <ProjectCardMetaDescription
                countryLabel={countryLabel}
                dataSourceLine={dataSourceLine}
                createdLine={createdLine}
                updatedLine={updatedLine}
              />
            }
          />
        </Card>
      </div>
    );
  },
);

ProjectCard.displayName = 'ProjectCard';

export { ProjectCard };
