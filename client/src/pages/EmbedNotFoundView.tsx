import { type FC } from 'react';
import { Flex, Typography } from 'antd';
import logoImage from '@/assets/images/logo/logo-high-resolution_small.png';
import { ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';

export const EmbedNotFoundView: FC = () => {
  const { t } = useTypedTranslation();

  return (
    <Flex vertical align="center" justify="center" gap="middle" className="w-full flex-1 p-4">
      <a href={ROUTES.HOME} target="_blank" rel="noopener noreferrer" className="no-underline">
        <Flex align="center" gap="small">
          <img
            src={logoImage}
            alt={t('appName')}
            className="h-6 w-auto object-contain"
            data-i18n-key="appName"
          />
          <Typography.Text strong className="text-primary text-lg">
            Regionify
          </Typography.Text>
        </Flex>
      </a>
      <Typography.Title
        level={3}
        className="text-primary mb-0! text-center"
        data-i18n-key="visualizer.embed.embedNotFoundTitle"
      >
        {t('visualizer.embed.embedNotFoundTitle')}
      </Typography.Title>
      <Typography.Paragraph
        type="secondary"
        className="mb-0! max-w-128 text-center wrap-break-word"
        data-i18n-key="visualizer.embed.embedNotFoundDescription"
      >
        {t('visualizer.embed.embedNotFoundDescription')}
      </Typography.Paragraph>
    </Flex>
  );
};
