import type { Project } from '@prisma/client';
import { ErrorCode, HttpStatus, BADGE_DETAILS } from '@regionify/shared';

import { AppError } from '@/middleware/errorHandler.js';
import {
  projectRepository,
  type ProjectCreate,
  type ProjectUpdate,
} from '@/repositories/projectRepository.js';
import { userRepository } from '@/repositories/userRepository.js';

export type ProjectEmbedSeoPublic = {
  title: string | null;
  description: string | null;
  keywords: string[] | null;
  allowedOrigins: string[] | null;
};

export type ProjectEmbedPublic = {
  enabled: boolean;
  token: string | null;
  showHeader: boolean;
  seo: ProjectEmbedSeoPublic;
};

export type ProjectPublic = {
  id: string;
  name: string;
  countryId: string | null;
  dataset: unknown;
  mapStyles: unknown;
  legendStyles: unknown;
  legendData: unknown;
  embed: ProjectEmbedPublic;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Locking is a user-set guard against accidental edits; it blocks every project mutation. */
export function assertProjectNotLocked(project: Project): void {
  if (!project.locked) return;
  throw new AppError(
    HttpStatus.CONFLICT,
    ErrorCode.PROJECT_LOCKED,
    'Project is locked. Unlock it before making changes.',
  );
}

function embedKeywordsFromDb(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  return value.filter((k): k is string => typeof k === 'string');
}

function embedAllowedOriginsFromDb(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  return value.filter((origin): origin is string => typeof origin === 'string');
}

function toEmbedPublic(project: Project): ProjectEmbedPublic {
  return {
    enabled: project.embedEnabled,
    token: project.embedToken,
    showHeader: project.embedShowHeader,
    seo: {
      title: project.embedSeoTitle,
      description: project.embedSeoDescription,
      keywords: embedKeywordsFromDb(project.embedSeoKeywords),
      allowedOrigins: embedAllowedOriginsFromDb(project.embedAllowedOrigins),
    },
  };
}

function toPublicProject(project: Project): ProjectPublic {
  return {
    id: project.id,
    name: project.name,
    countryId: project.countryId,
    dataset: project.dataset,
    mapStyles: project.mapStyles,
    legendStyles: project.legendStyles,
    legendData: project.legendData,
    embed: toEmbedPublic(project),
    locked: project.locked,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export const projectService = {
  async getProjectsByUser(userId: string): Promise<ProjectPublic[]> {
    const projects = await projectRepository.findByUserId(userId);
    return projects.map(toPublicProject);
  },

  async getProjectById(userId: string, projectId: string): Promise<ProjectPublic> {
    const project = await projectRepository.findById(projectId);

    if (!project || project.userId !== userId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Project not found');
    }

    return toPublicProject(project);
  },

  async createProject(userId: string, data: Omit<ProjectCreate, 'userId'>): Promise<ProjectPublic> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'User not found');
    }
    const limit = BADGE_DETAILS[user.badge].limits.maxProjectsCount;
    if (limit !== null) {
      const count = await projectRepository.countByUserId(userId);
      if (count >= limit) {
        throw new AppError(
          HttpStatus.FORBIDDEN,
          ErrorCode.PROJECT_LIMIT_REACHED,
          `Project limit reached. Your badge tier allows up to ${limit} projects.`,
        );
      }
    }
    const project = await projectRepository.create({ ...data, userId });
    return toPublicProject(project);
  },

  async updateProject(
    userId: string,
    projectId: string,
    data: ProjectUpdate,
  ): Promise<ProjectPublic> {
    const existing = await projectRepository.findById(projectId);

    if (!existing || existing.userId !== userId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Project not found');
    }

    assertProjectNotLocked(existing);

    const updated = await projectRepository.update(projectId, data);

    if (!updated) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        'Failed to update project',
      );
    }

    return toPublicProject(updated);
  },

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const existing = await projectRepository.findById(projectId);

    if (!existing || existing.userId !== userId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Project not found');
    }

    assertProjectNotLocked(existing);

    const deleted = await projectRepository.delete(projectId);

    if (!deleted) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        'Failed to delete project',
      );
    }
  },

  async bulkDeleteProjects(userId: string, ids: string[]): Promise<number> {
    return projectRepository.deleteManyForUser(userId, ids);
  },

  // Deliberately skips the locked guard — otherwise a locked project could never be unlocked.
  async setProjectLocked(
    userId: string,
    projectId: string,
    locked: boolean,
  ): Promise<ProjectPublic> {
    const existing = await projectRepository.findById(projectId);

    if (!existing || existing.userId !== userId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Project not found');
    }

    const updated = await projectRepository.update(projectId, { locked });

    if (!updated) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        'Failed to update project lock state',
      );
    }

    return toPublicProject(updated);
  },
};
