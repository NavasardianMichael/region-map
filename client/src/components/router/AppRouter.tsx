import { lazy, Suspense, useMemo } from 'react';
import { createBrowserRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { Flex } from 'antd';
import { APP_LAYOUT_CLASSNAMES } from '@/constants/layout';
import {
  isEmbedPathname,
  isFooterHiddenPath,
  isFullBleedPathname,
  ROUTES,
} from '@/constants/routes';
import { AppFooter } from '@/components/shared/AppFooter';
import { GoogleAnalytics } from '@/components/shared/GoogleAnalytics';
import { Navigation } from '@/components/shared/Navigation';
import { PageLoader } from '@/components/shared/PageLoader';
import AppErrorPage from '@/pages/AppErrorPage';

const HomePage = lazy(() => import('@/pages/HomePage'));
const VisualizerPage = lazy(() => import('@/pages/VisualizerPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignUpPage = lazy(() => import('@/pages/SignUpPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'));
const BillingPage = lazy(() => import('@/pages/BillingPage'));
const PaymentCheckoutPage = lazy(() => import('@/pages/PaymentCheckoutPage'));
const PaymentReturnPage = lazy(() => import('@/pages/PaymentReturnPage'));
const PaymentCancelPage = lazy(() => import('@/pages/PaymentCancelPage'));
const AccountDeletedPage = lazy(() => import('@/pages/AccountDeletedPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));
const EmbedPage = lazy(() => import('@/pages/EmbedPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const RefundPolicyPage = lazy(() => import('@/pages/RefundPolicyPage'));

function AppLayout() {
  const location = useLocation();
  const isEmbedRoute = isEmbedPathname(location.pathname);
  const isFullBleed = isFullBleedPathname(location.pathname);
  const isFooterHidden = isFooterHiddenPath(location.pathname);
  const MainOrRegion = isEmbedRoute ? 'div' : 'main';

  const { mainClassName, innerDivClassName } = useMemo(() => {
    if (isEmbedRoute) {
      return {
        // White, not the app's usual bg-gray-100 canvas — embed pages are meant to sit
        // flush inside a host page's own iframe, so the map area should read as blank/white
        // (matching .embed-shell-main in embed-shell.css) rather than carrying the app chrome's
        // gray background into someone else's site.
        mainClassName: 'min-h-0 min-w-0 w-full grow overflow-hidden bg-white',
        innerDivClassName: 'flex h-full min-h-0 w-full min-w-0 flex-col',
      };
    }
    if (isFullBleed) {
      return {
        mainClassName: 'grow overflow-y-auto',
        innerDivClassName: 'flex min-h-full flex-col',
      };
    }
    return {
      mainClassName: `grow flex flex-col overflow-y-auto bg-gray-100 `,
      innerDivClassName: `flex grow flex-col items-stretch ${APP_LAYOUT_CLASSNAMES.padding}`,
    };
  }, [isEmbedRoute, isFullBleed]);

  return (
    <>
      <GoogleAnalytics />
      <Flex
        vertical
        className={
          isEmbedRoute
            ? 'embed-route-root h-screen min-h-0 w-full min-w-0 overflow-hidden'
            : 'h-screen min-h-0 overflow-hidden'
        }
      >
        {!isEmbedRoute && <Navigation />}
        {/* Embed: SSR already outputs document <main> + <header>; use a region div to avoid nested <main>. */}
        <MainOrRegion className={mainClassName}>
          <div className={innerDivClassName}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
          {!isEmbedRoute && !isFooterHidden && <AppFooter />}
        </MainOrRegion>
      </Flex>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <AppErrorPage />,
    children: [
      { path: ROUTES.HOME, element: <HomePage /> },
      { path: ROUTES.PROJECT_EDITOR, element: <VisualizerPage /> },
      { path: ROUTES.PROJECT_NEW, element: <VisualizerPage /> },
      { path: ROUTES.PROJECT_BY_ID, element: <VisualizerPage /> },
      { path: ROUTES.EMBED_BY_TOKEN, element: <EmbedPage /> },
      { path: ROUTES.PROJECTS, element: <ProjectsPage /> },
      { path: ROUTES.CONTACT, element: <ContactPage /> },
      { path: ROUTES.ABOUT, element: <AboutPage /> },
      { path: ROUTES.FAQ, element: <FaqPage /> },
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.SIGN_UP, element: <SignUpPage /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
      { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordPage /> },
      { path: ROUTES.VERIFY_EMAIL, element: <VerifyEmailPage /> },
      { path: ROUTES.AUTH_CALLBACK, element: <AuthCallbackPage /> },
      { path: ROUTES.PROFILE, element: <AccountPage /> },
      { path: ROUTES.ACCOUNT_DELETED, element: <AccountDeletedPage /> },
      { path: ROUTES.BILLING, element: <BillingPage /> },
      { path: ROUTES.PAYMENTS_CHECKOUT, element: <PaymentCheckoutPage /> },
      { path: ROUTES.PAYMENTS_RETURN, element: <PaymentReturnPage /> },
      { path: ROUTES.PAYMENTS_CANCEL, element: <PaymentCancelPage /> },
      { path: ROUTES.TERMS, element: <TermsPage /> },
      { path: ROUTES.PRIVACY_POLICY, element: <PrivacyPolicyPage /> },
      { path: ROUTES.REFUND_POLICY, element: <RefundPolicyPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
