import { randomBytes } from 'node:crypto';

import {
  ErrorCode,
  getRegionEnglishLabelForMeta,
  HttpStatus,
  BADGE_DETAILS,
  type ProjectEmbedUpdateInput,
} from '@regionify/shared';

import { AppError } from '@/middleware/errorHandler.js';
import { localeToHtmlAndOg } from '@/lib/localeSeo.js';
import { projectRepository } from '@/repositories/projectRepository.js';
import { prisma } from '@/db/index.js';
import { assertProjectNotLocked, type ProjectEmbedPublic } from '@/services/projectService.js';

const EMBED_DESCRIPTION_MAX = 160;

function defaultEmbedDescription(projectName: string): string {
  const base = `Interactive regional map of ${projectName} on Regionify.`;
  if (base.length <= EMBED_DESCRIPTION_MAX) return base;
  return `${base.slice(0, EMBED_DESCRIPTION_MAX - 1).trimEnd()}…`;
}

export type PublicEmbedPayload = {
  countryId: string | null;
  dataset: unknown;
  mapStyles: unknown;
  legendStyles: unknown;
  legendData: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[] | null;
  showHeader: boolean;
};

function newEmbedToken(): string {
  return randomBytes(24).toString('base64url');
}

function toKeywordArray(value: unknown): string[] | null {
  if (value == null || !Array.isArray(value)) return null;
  return value.filter((k): k is string => typeof k === 'string');
}

function toAllowedOriginsArray(value: unknown): string[] | null {
  if (value == null || !Array.isArray(value)) return null;
  const normalized = value.filter((origin): origin is string => typeof origin === 'string');
  return Array.from(new Set(normalized));
}

export const projectEmbedService = {
  async getPublicPayloadByToken(token: string): Promise<PublicEmbedPayload> {
    const project = await projectRepository.findByEmbedToken(token);

    if (!project || !BADGE_DETAILS[project.user.badge]?.limits.publicEmbed) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Embed not found');
    }

    return {
      countryId: project.countryId,
      dataset: project.dataset,
      mapStyles: project.mapStyles,
      legendStyles: project.legendStyles,
      legendData: project.legendData,
      seoTitle: project.embedSeoTitle,
      seoDescription: project.embedSeoDescription,
      seoKeywords: toKeywordArray(project.embedSeoKeywords),
      showHeader: project.embedShowHeader,
    };
  },

  async getEmbedMetaForHtml(token: string): Promise<{
    title: string;
    description: string;
    keywords: string | null;
    allowedOrigins: string[] | null;
    projectName: string;
    htmlLang: string;
    ogLocale: string;
    regionDisplayNameEn: string | null;
    showHeader: boolean;
  }> {
    const project = await projectRepository.findByEmbedToken(token);

    if (!project || !BADGE_DETAILS[project.user.badge]?.limits.publicEmbed) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Embed not found');
    }

    const title = project.embedSeoTitle?.trim() || `${project.name} — Regionify`;
    const stored = project.embedSeoDescription?.trim();
    const description = stored
      ? stored.length > EMBED_DESCRIPTION_MAX
        ? `${stored.slice(0, EMBED_DESCRIPTION_MAX - 1).trimEnd()}…`
        : stored
      : defaultEmbedDescription(project.name);
    const kw = toKeywordArray(project.embedSeoKeywords);
    const keywords = kw && kw.length > 0 ? kw.join(', ') : null;
    const { htmlLang, ogLocale } = localeToHtmlAndOg(project.user.locale);
    const regionDisplayNameEn = getRegionEnglishLabelForMeta(project.countryId);

    return {
      title,
      description,
      keywords,
      allowedOrigins: toAllowedOriginsArray(project.embedAllowedOrigins),
      projectName: project.name,
      htmlLang,
      ogLocale,
      regionDisplayNameEn,
      showHeader: project.embedShowHeader,
    };
  },

  async updateEmbedSettings(
    userId: string,
    projectId: string,
    input: ProjectEmbedUpdateInput,
  ): Promise<{ embed: ProjectEmbedPublic }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { badge: true },
    });

    if (!user) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'User not found');
    }

    if (!BADGE_DETAILS[user.badge].limits.publicEmbed) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Public embed requires Chronographer badge',
      );
    }

    const existing = await projectRepository.findById(projectId);

    if (!existing || existing.userId !== userId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Project not found');
    }

    assertProjectNotLocked(existing);

    let embedToken: string | null = existing.embedToken;

    if (input.enabled) {
      embedToken = existing.embedToken ?? newEmbedToken();
    } else {
      embedToken = null;
    }

    const seoIn = input.seo;
    const embedSeoKeywords =
      seoIn === undefined || seoIn.keywords === undefined
        ? (existing.embedSeoKeywords as string[] | null)
        : seoIn.keywords;
    const embedAllowedOrigins =
      seoIn === undefined || seoIn.allowedOrigins === undefined
        ? (existing.embedAllowedOrigins as string[] | null)
        : seoIn.allowedOrigins;

    const embedSeoTitle = input.enabled ? (seoIn?.title ?? '').trim().slice(0, 200) : null;

    const descIn = seoIn?.description;
    const embedSeoDescription = input.enabled
      ? (descIn ?? '').trim()
      : descIn === undefined
        ? existing.embedSeoDescription
        : descIn === null
          ? null
          : descIn.trim() || null;

    const embedShowHeader = input.showHeader ?? existing.embedShowHeader;

    const updated = await projectRepository.update(projectId, {
      embedEnabled: input.enabled,
      embedToken,
      embedSeoTitle,
      embedSeoDescription,
      embedSeoKeywords: embedSeoKeywords as object | null,
      embedAllowedOrigins: embedAllowedOrigins as object | null,
      embedShowHeader,
    });

    if (!updated) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        'Failed to update embed settings',
      );
    }

    return {
      embed: {
        enabled: updated.embedEnabled,
        token: updated.embedToken,
        showHeader: updated.embedShowHeader,
        seo: {
          title: updated.embedSeoTitle,
          description: updated.embedSeoDescription,
          keywords: toKeywordArray(updated.embedSeoKeywords),
          allowedOrigins: toAllowedOriginsArray(updated.embedAllowedOrigins),
        },
      },
    };
  },
};
