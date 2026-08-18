import { existsSync } from 'node:fs';
import type { Application, Request, Response } from 'express';
import express from 'express';

import { ErrorCode, HttpStatus } from '@regionify/shared';

import { env, isProd } from '@/config/env.js';
import { AppError } from '@/middleware/errorHandler.js';
import { embedPageLimiter } from '@/middleware/embedPageLimiter.js';
import { logger } from '@/lib/logger.js';
import { projectEmbedService } from '@/services/projectEmbedService.js';
import { buildCoreJsonLd } from '@/web/coreJsonLd.js';
import { embedRootInnerHtml } from '@/web/embedCopy.js';
import { buildFaqJsonLd, faqRootInnerHtml } from '@/web/faqContent.js';
import { HOME_PAGE_DEFAULT, homeRootInnerHtml } from '@/web/homeCopy.js';
import { PAGE_META_MAP } from '@/web/pageMeta.js';
import { readClientEntryAssets } from '@/web/readClientManifest.js';
import { renderHtmlDocument } from '@/web/renderHtmlDocument.js';
import { buildAppSitemapXml, buildRobotsTxt, buildSitemapIndexXml } from '@/web/sitemap.js';

/** Visible `<header>` intro; full copy remains in meta tags. */
const EMBED_VISIBLE_INTRO_MAX_CHARS = 360;

function visibleEmbedIntro(description: string): string {
  const t = description.trim().replace(/\s+/g, ' ');
  if (t.length <= EMBED_VISIBLE_INTRO_MAX_CHARS) return t;
  return `${t.slice(0, EMBED_VISIBLE_INTRO_MAX_CHARS - 1).trimEnd()}\u2026`;
}

/** HTML shell for `/embed/:token` when the token is missing or disabled — SPA shows `EmbedNotFoundView`. */
const EMBED_NOT_FOUND_DOCUMENT_TITLE = 'Regionify — Map embed';
const EMBED_NOT_FOUND_META_DESCRIPTION =
  'This public map embed is not available. The link may be invalid or the embed was disabled.';

const API_PATH_PREFIXES = [
  '/health',
  '/auth',
  '/contact',
  '/payments',
  '/projects',
  '/sheets',
  '/embed-data',
] as const;

function isApiPath(path: string): boolean {
  return API_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

function buildFrameAncestorsDirective(allowedOrigins: string[] | null): string {
  const origins = allowedOrigins ?? [];
  if (origins.includes('*')) return 'frame-ancestors *';

  const safeOrigins = origins.filter((origin) => {
    if (!origin) return false;
    try {
      const url = new URL(origin);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  });
  const sources = [`'self'`, ...safeOrigins];
  return `frame-ancestors ${sources.join(' ')}`;
}

function withFrameAncestorsDirective(existing: unknown, frameAncestorsDirective: string): string {
  const raw = typeof existing === 'string' ? existing : '';
  const directives = raw
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => !d.toLowerCase().startsWith('frame-ancestors'));
  directives.push(frameAncestorsDirective);
  return `${directives.join('; ')};`;
}

/**
 * Serves the Vite client build and HTML shells for SEO-critical routes.
 */
export function setupWebClient(app: Application): void {
  const staticDir = env.CLIENT_STATIC_DIR;
  if (!staticDir || !existsSync(staticDir)) {
    if (staticDir && isProd) {
      throw new Error(
        `CLIENT_STATIC_DIR is set but path does not exist: ${staticDir}. ` +
          'Ensure client/dist is baked into the image or remove CLIENT_STATIC_DIR in production.',
      );
    }
    if (staticDir) {
      logger.warn(
        { staticDir },
        'CLIENT_STATIC_DIR set but path does not exist; skipping web static',
      );
    }
    return;
  }

  let assets: ReturnType<typeof readClientEntryAssets>;
  try {
    assets = readClientEntryAssets(staticDir);
  } catch (e) {
    if (isProd) {
      throw new Error(
        `Failed to read Vite client manifest under ${staticDir}. ` +
          'Rebuild the client with manifest enabled and include .vite/manifest.json in the image.',
        { cause: e },
      );
    }
    logger.error({ err: e }, 'Failed to read Vite client manifest; skipping web static');
    return;
  }

  const siteUrl = env.CLIENT_URL;
  const googleSiteVerification = env.GOOGLE_SITE_VERIFICATION;

  app.get('/', (_req: Request, res: Response) => {
    const html = renderHtmlDocument({
      siteUrl,
      meta: {
        documentTitle: HOME_PAGE_DEFAULT.documentTitle,
        description: HOME_PAGE_DEFAULT.metaDescription,
        keywords: HOME_PAGE_DEFAULT.metaKeywords,
        canonicalPath: '/',
      },
      rootInnerHtml: homeRootInnerHtml(),
      entryJs: assets.js,
      entryCss: assets.css,
      googleSiteVerification,
      extraJsonLd: [buildCoreJsonLd(siteUrl)],
    });
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
  });

  const embedEntryCss = [...assets.css, assets.embedShellCss];

  app.get('/embed/:token', embedPageLimiter, async (req: Request, res: Response, next) => {
    try {
      const rawToken = req.params.token;
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      const meta = await projectEmbedService.getEmbedMetaForHtml(token);
      const frameAncestorsDirective = buildFrameAncestorsDirective(meta.allowedOrigins);
      const cspWithFrameAncestors = withFrameAncestorsDirective(
        res.getHeader('Content-Security-Policy'),
        frameAncestorsDirective,
      );
      const kw = meta.keywords;
      const showHeader = meta.showHeader;
      const html = renderHtmlDocument({
        siteUrl,
        meta: {
          documentTitle: meta.title,
          description: meta.description,
          keywords: kw,
          canonicalPath: `/embed/${encodeURIComponent(token)}`,
          regionDisplayNameEn: meta.regionDisplayNameEn,
        },
        rootInnerHtml: embedRootInnerHtml(siteUrl),
        entryJs: assets.js,
        entryCss: embedEntryCss,
        htmlLang: meta.htmlLang,
        ogLocale: meta.ogLocale,
        includeEmbedJsonLd: true,
        googleSiteVerification,
        ...(showHeader
          ? {
              embedSemantic: {
                heading: meta.title,
                intro: visibleEmbedIntro(meta.description),
              },
            }
          : { embedShellLayout: true }),
      });
      res.removeHeader('X-Frame-Options');
      res
        .status(200)
        .setHeader('Content-Security-Policy', cspWithFrameAncestors)
        .setHeader('Content-Type', 'text/html; charset=utf-8')
        .send(html);
    } catch (e) {
      if (
        e instanceof AppError &&
        e.code === ErrorCode.NOT_FOUND &&
        e.statusCode === HttpStatus.NOT_FOUND
      ) {
        const rawToken = req.params.token;
        const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
        const html = renderHtmlDocument({
          siteUrl,
          meta: {
            documentTitle: EMBED_NOT_FOUND_DOCUMENT_TITLE,
            description: EMBED_NOT_FOUND_META_DESCRIPTION,
            keywords: null,
            canonicalPath: `/embed/${encodeURIComponent(token)}`,
          },
          rootInnerHtml: '',
          entryJs: assets.js,
          entryCss: embedEntryCss,
          embedShellLayout: true,
          includeEmbedJsonLd: false,
          robots: 'noindex, nofollow',
        });
        res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
        return;
      }
      next(e);
    }
  });

  app.get('/sitemap.xml', (_req: Request, res: Response) => {
    const xml = buildSitemapIndexXml(siteUrl);
    res.status(200).setHeader('Content-Type', 'application/xml; charset=utf-8').send(xml);
  });

  app.get('/app-sitemap.xml', async (_req: Request, res: Response, next) => {
    try {
      const xml = await buildAppSitemapXml(siteUrl);
      res.status(200).setHeader('Content-Type', 'application/xml; charset=utf-8').send(xml);
    } catch (e) {
      next(e);
    }
  });

  app.get('/robots.txt', (_req: Request, res: Response) => {
    res
      .status(200)
      .setHeader('Content-Type', 'text/plain; charset=utf-8')
      .send(buildRobotsTxt(siteUrl));
  });

  const marketingStaticDir = env.MARKETING_STATIC_DIR;
  if (marketingStaticDir && existsSync(marketingStaticDir)) {
    app.use(express.static(marketingStaticDir, { index: 'index.html', fallthrough: true }));
    logger.info({ marketingStaticDir }, 'Marketing static mounted at / (fallthrough)');
  }

  app.use(express.static(staticDir, { index: false, fallthrough: true }));

  const NOINDEX_PREFIXES = [
    '/login',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/auth/callback',
    '/account-deleted',
    '/profile',
    '/billing',
    '/projects',
    '/payments/checkout',
    '/payments/return',
    '/payments/cancel',
  ] as const;

  function isNoIndexPath(path: string): boolean {
    return NOINDEX_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  }

  app.get('/{*path}', (req: Request, res: Response, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }
    if (isApiPath(req.path)) {
      next();
      return;
    }

    // Static-asset requests (e.g. .js, .css, .map) must not receive an HTML
    // fallback — browsers reject the wrong MIME type for module scripts.
    if (/\.\w{2,}$/.test(req.path)) {
      next();
      return;
    }

    const routeMeta = PAGE_META_MAP[req.path];
    const noindex = isNoIndexPath(req.path);
    const isFaq = req.path === '/faq';
    const isKnownRoute = req.path === '/' || routeMeta !== undefined || noindex;

    // Unknown path (typo, stale backlink, bot probe, pre-migration URL, ...): serve a real 404
    // instead of 200'ing homepage meta with a self-referencing canonical — that combination told
    // crawlers every bad URL was a distinct indexable page duplicating the homepage, which is why
    // GSC flagged "Duplicate, Google chose different canonical than user" on stray paths.
    if (!isKnownRoute) {
      const html = renderHtmlDocument({
        siteUrl,
        meta: {
          documentTitle: 'Page not found | Regionify',
          description: 'The page you are looking for does not exist or has been moved.',
          keywords: null,
          canonicalPath: req.path || '/',
        },
        rootInnerHtml: '',
        entryJs: assets.js,
        entryCss: assets.css,
        googleSiteVerification,
        extraJsonLd: [],
        robots: 'noindex, nofollow',
      });
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
      return;
    }

    const html = renderHtmlDocument({
      siteUrl,
      meta: {
        documentTitle: routeMeta?.documentTitle ?? HOME_PAGE_DEFAULT.documentTitle,
        description: routeMeta?.description ?? HOME_PAGE_DEFAULT.metaDescription,
        keywords: routeMeta?.keywords ?? HOME_PAGE_DEFAULT.metaKeywords,
        canonicalPath: req.path || '/',
      },
      rootInnerHtml: isFaq ? faqRootInnerHtml() : '',
      entryJs: assets.js,
      entryCss: assets.css,
      googleSiteVerification,
      // Skip structured data on noindex (private/account) routes — nothing there should be cited.
      extraJsonLd: noindex
        ? []
        : isFaq
          ? [buildCoreJsonLd(siteUrl), buildFaqJsonLd()]
          : [buildCoreJsonLd(siteUrl)],
      ...(noindex ? { robots: 'noindex, nofollow' } : {}),
    });
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
  });
}
