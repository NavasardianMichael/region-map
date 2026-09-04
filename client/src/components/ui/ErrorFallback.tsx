import { type FC, useMemo } from 'react';
import { Button, Flex, Result } from 'antd';
import { ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';

type Props = {
  title?: string;
  showGoHome?: boolean;
};

export const ErrorFallback: FC<Props> = ({ title, showGoHome = false }) => {
  const { t } = useTypedTranslation();

  const extra = useMemo(
    () => [
      showGoHome && (
        <Button
          key="home"
          type="dashed"
          onClick={() => {
            window.location.href = ROUTES.HOME;
          }}
        >
          {t('errors.goHome')}
        </Button>
      ),
      <Button key="reload" type="dashed" onClick={() => window.location.reload()}>
        {t('errors.reload')}
      </Button>,
      <Button
        key="contact"
        type="dashed"
        onClick={() => {
          window.location.href = ROUTES.CONTACT;
        }}
      >
        {t('errors.contactSupport')}
      </Button>,
    ],
    [showGoHome, t],
  );

  return (
    <Flex align="center" justify="center" className="min-h-0 flex-1">
      <Result status="500" title={title ?? t('errors.appCrashed')} extra={extra} />
    </Flex>
  );
};
