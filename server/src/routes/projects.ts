import {
  ErrorCode,
  HttpStatus,
  isValidProjectCountryId,
  projectEmbedUpdateSchema,
  projectLockUpdateSchema,
  projectsBulkDeleteSchema,
} from '@regionify/shared';
import { type Router as ExpressRouter, Router } from 'express';

import { AppError } from '@/middleware/errorHandler.js';
import { validate } from '@/middleware/validate.js';
import { requireAuth } from '@/middleware/requireAuth.js';
import { projectEmbedService } from '@/services/projectEmbedService.js';
import { projectService } from '@/services/projectService.js';

const router: ExpressRouter = Router();

// All project routes require authentication
router.use(requireAuth);

// GET /api/projects - List user's projects
router.get('/', async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const projects = await projectService.getProjectsByUser(userId);

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const project = await projectService.getProjectById(userId, req.params.id);

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects - Create a project
router.post('/', async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const { name, countryId, dataset, mapStyles, legendStyles, legendData } = req.body;

    if (!isValidProjectCountryId(countryId)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'Invalid or unsupported countryId',
      );
    }

    const project = await projectService.createProject(userId, {
      name,
      countryId: countryId ?? null,
      dataset: dataset ?? null,
      mapStyles: mapStyles ?? null,
      legendStyles: legendStyles ?? null,
      legendData: legendData ?? null,
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

// POST /projects/bulk-delete - Delete multiple projects (single DB round-trip)
router.post('/bulk-delete', validate(projectsBulkDeleteSchema), async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const { ids } = req.body;
    const deletedCount = await projectService.bulkDeleteProjects(userId, ids);

    res.json({
      success: true,
      data: { deletedCount },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /projects/:id/embed - Update public embed settings (Chronographer)
router.put('/:id/embed', validate(projectEmbedUpdateSchema), async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const rawId = req.params.id;
    const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
    const data = await projectEmbedService.updateEmbedSettings(userId, projectId, req.body);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /projects/:id/lock - Lock or unlock a project (must precede PUT /:id)
router.put('/:id/lock', validate(projectLockUpdateSchema), async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const rawId = req.params.id;
    const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
    const project = await projectService.setProjectLocked(userId, projectId, req.body.locked);

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /projects/:id - Update a project
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const { name, countryId, dataset, mapStyles, legendStyles, legendData } = req.body;

    const trimmedName =
      typeof name === 'string' && name.trim().length > 0 ? name.trim() : undefined;

    if (countryId !== undefined && !isValidProjectCountryId(countryId)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'Invalid or unsupported countryId',
      );
    }

    const project = await projectService.updateProject(userId, req.params.id, {
      ...(trimmedName !== undefined && { name: trimmedName }),
      ...(countryId !== undefined && { countryId }),
      ...(dataset !== undefined && { dataset }),
      ...(mapStyles !== undefined && { mapStyles }),
      ...(legendStyles !== undefined && { legendStyles }),
      ...(legendData !== undefined && { legendData }),
    });

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    await projectService.deleteProject(userId, req.params.id);

    res.json({
      success: true,
      data: { message: 'Project deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export const projectRoutes: ExpressRouter = router;
