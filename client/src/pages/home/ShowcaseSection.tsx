import { type FC, useMemo } from 'react';
import { Flex, Typography } from 'antd';
import embedIframePng from '@/assets/images/showcases/embed-iframe.png';
import embedPagePng from '@/assets/images/showcases/embed-page.png';
import regionifyAnimationGif from '@/assets/images/showcases/regionify-animation.gif';
import regionifyEuropeSvg from '@/assets/images/showcases/regionify-europe.svg';
import regionifyVideoMp4 from '@/assets/images/showcases/regionify-video.mp4';
import { ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { AppButtonStyleLink } from '@/components/ui/AppButtonStyleLink';

type ShowcaseItem = {
  title: string;
  description: string;
  badgeName: string;
  assetId: string;
};

const SHOWCASE_CONTENT_MAP: Record<string, React.ReactNode> = {
  svg: (
    <Flex align="center" justify="center" className="h-full w-full">
      <img
        src={regionifyEuropeSvg}
        alt="Regionify Europe Showcase"
        className="max-h-full max-w-full"
        loading="lazy"
      />
    </Flex>
  ),
  gif: (
    <Flex align="center" justify="center" className="h-full w-full">
      <img
        src={regionifyAnimationGif}
        alt="Regionify Animation Showcase"
        className="max-h-full max-w-full"
        loading="lazy"
      />
    </Flex>
  ),
  mp4: (
    <video src={regionifyVideoMp4} className="max-h-full max-w-full" controls playsInline>
      <track kind="captions" />
    </video>
  ),
  'public-page': (
    <Flex align="center" justify="center" className="h-full w-full">
      <img
        src={embedPagePng}
        alt="Regionify Embed Page Showcase"
        className="max-h-full max-w-full"
        loading="lazy"
      />
    </Flex>
  ),
  embed: (
    <Flex align="center" justify="center" className="h-full w-full">
      <img
        src={embedIframePng}
        alt="Regionify Embed Iframe Showcase"
        className="max-h-full max-w-full"
        loading="lazy"
      />
    </Flex>
  ),
};

const DEFAULT_SHOWCASE_PLACEHOLDER = (assetId: string) => (
  <Flex align="center" justify="center" className="h-full w-full">
    <Typography.Text className="text-gray-400 select-none">{assetId.toUpperCase()}</Typography.Text>
  </Flex>
);

export const ShowcaseSection: FC = () => {
  const { t } = useTypedTranslation();

  const items = useMemo<ShowcaseItem[]>(
    () => [
      {
        title: t('home.showcaseSvgTitle'),
        description: t('home.showcaseSvgDesc'),
        badgeName: t('badges.items.explorer.name'),
        assetId: 'svg',
      },
      {
        title: t('home.showcaseGifTitle'),
        description: t('home.showcaseGifDesc'),
        badgeName: t('badges.items.explorer.name'),
        assetId: 'gif',
      },
      {
        title: t('home.showcaseMp4Title'),
        description: t('home.showcaseMp4Desc'),
        badgeName: t('badges.items.explorer.name'),
        assetId: 'mp4',
      },
      {
        title: t('home.showcasePublicPageTitle'),
        description: t('home.showcasePublicPageDesc'),
        badgeName: t('badges.items.chronographer.name'),
        assetId: 'public-page',
      },
      {
        title: t('home.showcaseEmbedTitle'),
        description: t('home.showcaseEmbedDesc'),
        badgeName: t('badges.items.chronographer.name'),
        assetId: 'embed',
      },
    ],
    [t],
  );

  return (
    <section className="bg-white px-6 py-16 md:py-20">
      <div className="mx-auto w-full max-w-5xl">
        <Flex vertical gap={48}>
          <Typography.Title
            level={2}
            className="text-primary mb-0! text-center text-2xl font-bold md:text-3xl"
            data-i18n-key="home.showcaseTitle"
          >
            {t('home.showcaseTitle')}
          </Typography.Title>
          {items.map(({ title, description, badgeName, assetId }, index) => (
            <div
              key={assetId}
              className={`flex flex-col items-center gap-10 ${index > 0 ? 'border-t border-gray-200 pt-12' : ''} ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
            >
              <Flex vertical gap="middle" className="min-w-0 flex-1">
                <Typography.Title
                  level={3}
                  className="mb-0! text-xl font-semibold"
                  data-i18n-key="home.showcaseSvgTitle"
                >
                  {title}
                </Typography.Title>
                <Typography.Paragraph
                  className="mb-0! text-gray-500"
                  data-i18n-key="home.showcaseSvgDesc"
                >
                  {description}
                </Typography.Paragraph>
                <div>
                  <AppButtonStyleLink
                    href={ROUTES.BILLING}
                    type="primary"
                    data-i18n-key="badges.items.explorer.name"
                  >
                    {badgeName} →
                  </AppButtonStyleLink>
                </div>
              </Flex>
              <Flex
                align="center"
                justify="center"
                className="aspect-video w-full min-w-0 flex-1 rounded-lg border border-dashed border-gray-300"
                data-showcase={assetId}
              >
                {SHOWCASE_CONTENT_MAP[assetId] ?? DEFAULT_SHOWCASE_PLACEHOLDER(assetId)}
              </Flex>
            </div>
          ))}
        </Flex>
      </div>
    </section>
  );
};
