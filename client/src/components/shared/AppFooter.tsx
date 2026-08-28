import { type FC } from 'react';
import { Flex } from 'antd';
import { ROUTES } from '@/constants/routes';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { GooglePreferredSourceButton } from '@/components/shared/GooglePreferredSourceButton';
import { AppNavLink } from '@/components/ui/AppNavLink';

const LINK_CLASS = 'underline! font-semibold transition-colors';

export const AppFooter: FC = () => {
  const { t, i18n } = useTypedTranslation();
  const language = (i18n.resolvedLanguage ?? i18n.language).split('-')[0];

  return (
    <footer className="border-t border-gray-200 bg-white p-6">
      <Flex justify="center" align="center" gap="middle" wrap="wrap">
        <AppNavLink to={ROUTES.TERMS} className={LINK_CLASS}>
          {t('footer.terms')}
        </AppNavLink>
        <AppNavLink to={ROUTES.PRIVACY_POLICY} className={LINK_CLASS}>
          {t('footer.privacy')}
        </AppNavLink>
        <AppNavLink to={ROUTES.REFUND_POLICY} className={LINK_CLASS}>
          {t('footer.refund')}
        </AppNavLink>
        <AppNavLink to={ROUTES.CONTACT} className={LINK_CLASS}>
          {t('footer.contact')}
        </AppNavLink>
        <AppNavLink to={ROUTES.FAQ} className={LINK_CLASS}>
          {t('footer.faq')}
        </AppNavLink>
      </Flex>
      <GooglePreferredSourceButton language={language} />
    </footer>
  );
};
