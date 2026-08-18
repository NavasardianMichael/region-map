import { escapeHtml } from '@/lib/htmlEscape.js';

/**
 * Crawlable attribution rendered inside `#root` on `/embed/:token`.
 *
 * React replaces `#root`'s children on mount, so visitors never see this — the
 * client-rendered `MadeWithRegionifyBadge` is the attribution they actually see.
 * It exists for crawlers that don't execute JS (notably AI answer-engine bots),
 * which otherwise fetch an embed page whose body is an empty `<div id="root">`
 * containing no link back to the site at all.
 *
 * Deliberately just the attribution link: the visible page is a map, so emitting
 * headings or prose that only crawlers ever see would be cloaking. The link is
 * truthful and mirrors the badge real visitors get.
 */
export function embedRootInnerHtml(siteUrl: string): string {
  const href = escapeHtml(siteUrl.replace(/\/$/, '') || 'https://regionify.pro');
  return `<p>Made with <a href="${href}/">Regionify</a></p>`;
}
