import { getEmbedRoute } from '@/constants/routes';
import {
  ALLOWED_ORIGIN_MAX_COUNT,
  ALLOWED_ORIGIN_MAX_LENGTH,
  IFRAME_HEIGHT_PX,
  IFRAME_TITLE,
  KEYWORD_MAX_COUNT,
  KEYWORD_MAX_LENGTH,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
} from './constants';

export function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === 'string')
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, KEYWORD_MAX_COUNT);
}

export function sanitizeKeywords(tags: string[]): string[] {
  return tags
    .map((t) => t.trim().slice(0, KEYWORD_MAX_LENGTH))
    .filter((t) => t.length > 0)
    .slice(0, KEYWORD_MAX_COUNT);
}

function normalizeOrigin(value: string): string {
  const url = new URL(value.trim());
  return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}`;
}

export function isValidAllowedOrigin(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('*')) return false;
  try {
    const url = new URL(trimmed);
    if (!(url.protocol === 'http:' || url.protocol === 'https:')) return false;
    if (!url.hostname) return false;
    if (url.username || url.password) return false;
    if (url.search || url.hash) return false;
    return url.pathname === '/' || url.pathname === '';
  } catch {
    return false;
  }
}

export function sanitizeAllowedOrigins(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const trimmed = raw.trim().slice(0, ALLOWED_ORIGIN_MAX_LENGTH);
    if (!trimmed) continue;
    if (!isValidAllowedOrigin(trimmed)) {
      result.push(trimmed);
      continue;
    }
    const normalized = normalizeOrigin(trimmed);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
    if (result.length >= ALLOWED_ORIGIN_MAX_COUNT) break;
  }
  return result;
}

export function normalizeAllowedOrigins(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return sanitizeAllowedOrigins(value.filter((x): x is string => typeof x === 'string'));
}

export function buildAutoEmbedTitle(projectName: string): string {
  return `${projectName} — Regionify`.trim().slice(0, SEO_TITLE_MAX);
}

export function trimDefaultSeoDescription(text: string): string {
  return text.trim().slice(0, SEO_DESCRIPTION_MAX);
}

type BuildEmbedPageUrlInput = {
  origin: string;
  token: string | null | undefined;
  enabled: boolean;
};

/** Public embed page URL (no query params). Header visibility is set per project and applied at SSR. */
export function buildEmbedPageUrl({ origin, token, enabled }: BuildEmbedPageUrlInput): string {
  if (!token || !enabled) return '';
  return `${origin}${getEmbedRoute(token)}`;
}

/** Iframe only — nothing is emitted into the host page alongside it. */
export function buildIframeSnippet(embedPageUrl: string): string {
  if (!embedPageUrl) return '';
  return [
    '<iframe',
    `  src="${embedPageUrl}"`,
    '  width="100%"',
    `  height="${IFRAME_HEIGHT_PX}"`,
    '  style="border:0"',
    `  title="${IFRAME_TITLE}"`,
    '></iframe>',
  ].join('\n');
}
