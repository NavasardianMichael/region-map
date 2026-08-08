import { type FC, lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { Flex, Spin, Typography } from 'antd';
import { fetchPublicEmbedData, PublicEmbedNotFoundError } from '@/api/embed';
import type { PublicEmbedApiResponse } from '@/api/embed/types';
import type { Project } from '@/api/projects/types';
import { useAnimationStore } from '@/store/animation/store';
import { selectHasTimelineData } from '@/store/mapData/selectors';
import { useVisualizerStore } from '@/store/mapData/store';
import { useLoadProject } from '@/hooks/useLoadProject';
import { ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { resetVisualizerToDefaultState } from '@/helpers/applyFullTemporaryProjectState';
import { AppNavLink } from '@/components/ui/AppNavLink';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import MapViewer from '@/components/visualizer/MapViewer';
import { EmbedNotFoundView } from '@/pages/EmbedNotFoundView';
import '@/embed/embed-shell.css';

const AnimationControls = lazy(() => import('@/components/visualizer/AnimationControls'));

function buildProjectFromEmbedPayload(data: PublicEmbedApiResponse): Project {
  return {
    id: '__embed__',
    name: '',
    countryId: data.countryId,
    dataset: data.dataset,
    mapStyles: data.mapStyles,
    legendStyles: data.legendStyles,
    legendData: data.legendData,
    embed: {
      enabled: false,
      token: null,
      showHeader: data.showHeader,
      seo: {
        title: null,
        description: null,
        keywords: null,
        allowedOrigins: null,
      },
    },
    createdAt: '',
    updatedAt: '',
  };
}

const EmbedPage: FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTypedTranslation();
  const loadProject = useLoadProject();
  const hasTimelineData = useVisualizerStore(selectHasTimelineData);
  const [hasError, setHasError] = useState(false);
  const [embedNotFound, setEmbedNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [embedMeta, setEmbedMeta] = useState<{
    title: string | null;
    description: string | null;
    showHeader: boolean;
  } | null>(null);

  /** When SSR did not output a header (e.g. SPA shell), render one client-side if the project allows it. */
  const showClientHeader =
    embedMeta !== null &&
    embedMeta.showHeader &&
    (embedMeta.title ?? embedMeta.description) &&
    !document.querySelector('.embed-shell-header');

  useEffect(() => {
    if (!token) {
      setEmbedNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setEmbedNotFound(false);
    setHasError(false);
    useAnimationStore.getState().reset();

    const run = async () => {
      try {
        const data = await fetchPublicEmbedData(token);
        if (cancelled) return;
        resetVisualizerToDefaultState();
        loadProject(buildProjectFromEmbedPayload(data), {
          associateWithProjectsStore: false,
        });
        setEmbedMeta({
          title: data.seoTitle,
          description: data.seoDescription,
          showHeader: data.showHeader,
        });
        setHasError(false);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof PublicEmbedNotFoundError) {
            setEmbedNotFound(true);
            setHasError(false);
          } else {
            setEmbedNotFound(false);
            setHasError(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      useAnimationStore.getState().reset();
    };
  }, [token, loadProject]);

  // Public embeds should play historical timelines immediately (same motion as preview after Play).
  useEffect(() => {
    if (loading || hasError || embedNotFound || !hasTimelineData) return;

    useAnimationStore.getState().play();

    return () => {
      useAnimationStore.getState().pause();
    };
  }, [loading, hasError, embedNotFound, hasTimelineData]);

  if (loading) {
    return (
      <Flex align="center" justify="center" className="min-h-60 w-full flex-1">
        <Spin size="large" />
      </Flex>
    );
  }

  if (embedNotFound) {
    return <EmbedNotFoundView />;
  }

  if (hasError) {
    return (
      <Flex
        vertical
        align="center"
        justify="center"
        gap="small"
        className="min-h-60 w-full flex-1 p-4"
      >
        <Typography.Text
          type="secondary"
          className="text-center"
          data-i18n-key="visualizer.embed.embedErrorMessage"
        >
          {t('visualizer.embed.embedErrorMessage')}
          <AppNavLink to={ROUTES.CONTACT} data-i18n-key="visualizer.embed.embedErrorContactUs">
            {t('visualizer.embed.embedErrorContactUs')}
          </AppNavLink>
        </Typography.Text>
      </Flex>
    );
  }

  return (
    <Flex vertical className="h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
      {showClientHeader && embedMeta && (embedMeta.title ?? embedMeta.description) && (
        <header className="embed-shell-header">
          {embedMeta.title && <h1 className="embed-shell-title">{embedMeta.title}</h1>}
          {embedMeta.description && <p className="embed-shell-intro">{embedMeta.description}</p>}
        </header>
      )}
      {hasTimelineData && (
        <Suspense>
          <AnimationControls />
        </Suspense>
      )}
      <Flex className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <Sentry.ErrorBoundary fallback={<ErrorFallback title={t('errors.mapRenderFailed')} />}>
          <MapViewer
            className="min-h-0 min-w-0 flex-1"
            flatEmbedChrome
            enforceObserverWatermark={false}
          />
        </Sentry.ErrorBoundary>
      </Flex>
    </Flex>
  );
};

export default EmbedPage;
