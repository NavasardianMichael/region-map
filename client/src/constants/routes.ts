/** True for public map embed URLs (`/embed/:token`), which should not load app analytics. */
export function isEmbedPathname(pathname: string): boolean {
  return /^\/embed\/[^/]+$/.test(pathname);
}

/** True for pages that use full-bleed section layout (no app padding, no gray background). */
export function isFullBleedPathname(pathname: string): boolean {
  const fullBleedPaths = [
    ROUTES.HOME,
    ROUTES.ABOUT,
    ROUTES.CONTACT,
    ROUTES.TERMS,
    ROUTES.PRIVACY_POLICY,
    ROUTES.REFUND_POLICY,
  ] as string[];
  return fullBleedPaths.includes(pathname);
}

/** True for pages that occupy the full viewport and should not show the footer. */
export function isFooterHiddenPath(pathname: string): boolean {
  const paths = [
    ROUTES.PROJECT_EDITOR,
    ROUTES.PROJECT_NEW,
    ROUTES.CONTACT,
    ROUTES.BILLING,
  ] as string[];
  return paths.includes(pathname) || /^\/projects\/[^/]+$/.test(pathname);
}

export const EXTERNAL_URLS = {
  GOOGLE_PREFERRED_SOURCE_SCRIPT: 'https://news.google.com/swg/js/v1/publisher.js',
  PADDLE: 'https://www.paddle.com',
} as const;

export const ROUTES = {
  HOME: '/',
  PROJECTS: '/projects',
  PROJECT_EDITOR: '/projects/edit',
  PROJECT_NEW: '/projects/new',
  PROJECT_BY_ID: '/projects/:projectId',
  /** Public map embed (standalone URL or iframe). */
  EMBED_BY_TOKEN: '/embed/:token',
  CONTACT: '/contact',
  ABOUT: '/about',
  FAQ: '/faq',
  BILLING: '/billing',

  // Auth routes
  PROFILE: '/profile',
  LOGIN: '/login',
  SIGN_UP: '/sign-up',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  AUTH_CALLBACK: '/auth/callback',
  ACCOUNT_DELETED: '/account-deleted',

  // Legal pages (required by Paddle for merchant verification)
  TERMS: '/terms',
  PRIVACY_POLICY: '/privacy',
  REFUND_POLICY: '/refund',

  // Paddle hosted-overlay opener (Paddle.js auto-opens checkout when `?_ptxn=` is present)
  PAYMENTS_CHECKOUT: '/payments/checkout',
  // Payment return/cancel (after the overlay completes / is closed)
  PAYMENTS_RETURN: '/payments/return',
  PAYMENTS_CANCEL: '/payments/cancel',
} as const;

/**
 * Helper to generate project route with ID
 */
export function getProjectRoute(projectId: string): string {
  return `/projects/${projectId}`;
}

export function getEmbedRoute(embedToken: string): string {
  return `/embed/${encodeURIComponent(embedToken)}`;
}

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
