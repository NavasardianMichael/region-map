import { ErrorCode, HttpStatus } from '@regionify/shared';
import { type Router as ExpressRouter, Router } from 'express';
import { z } from 'zod';

import { env, isDev } from '@/config/env.js';
import { AppError } from '@/middleware/errorHandler.js';
import { requireAuth } from '@/middleware/requireAuth.js';
import { requireAiAccess } from '@/middleware/requireAiAccess.js';
import { validate } from '@/middleware/validate.js';
import { logger } from '@/lib/logger.js';
import {
  type AiStreamEvent,
  MAX_AI_PARSE_INPUT_CHARS,
  getAiParseRemaining,
  streamAiGenerate,
  streamAiParse,
} from '@/services/aiService.js';

const router: ExpressRouter = Router();

const aiParseSchema = z.object({
  text: z.string().min(1).max(MAX_AI_PARSE_INPUT_CHARS),
  mapRegionIds: z.array(z.string()).max(5000).default([]),
});

const aiGenerateSchema = z.object({
  prompt: z.string().min(1).max(MAX_AI_PARSE_INPUT_CHARS),
  mapRegionIds: z.array(z.string()).max(5000).default([]),
  countryName: z.string().trim().max(200).optional(),
});

/**
 * Pump an AI stream generator to the SSE response, handling errors uniformly.
 * `label` is included in error messages surfaced in development mode.
 */
async function pumpAiStream(
  res: import('express').Response,
  req: import('express').Request,
  generator: AsyncGenerator<AiStreamEvent>,
  label: string,
): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  req.on('close', () => {
    void generator.return(undefined);
  });

  try {
    for await (const event of generator) {
      switch (event.type) {
        case 'remaining':
          res.write(`data: ${JSON.stringify({ meta: { remaining: event.count } })}\n\n`);
          break;
        case 'delta':
          res.write(`data: ${JSON.stringify({ delta: event.text })}\n\n`);
          break;
        case 'done':
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        case 'error':
          res.write(`data: ${JSON.stringify({ error: event.message })}\n\n`);
          res.end();
          return;
      }
    }
  } catch (error) {
    logger.error({ err: error }, `AI ${label} stream error`);
    let message: string;
    if (error instanceof AppError) {
      message = error.message;
    } else if (isDev) {
      const original = error instanceof Error ? error.message : String(error);
      message = `AI ${label} failed: ${original}`;
    } else {
      message = `AI ${label} failed. Please try again.`;
    }
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
}

// POST /api/ai/parse — stream tab-delimited transformation via SSE
router.post('/parse', requireAuth, requireAiAccess, validate(aiParseSchema), async (req, res) => {
  if (!env.GEMINI_API_KEY) {
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'AI service is not configured.' },
    });
    return;
  }

  const { text, mapRegionIds } = req.body as z.infer<typeof aiParseSchema>;
  const userId = req.session.userId!;
  await pumpAiStream(res, req, streamAiParse(text, mapRegionIds, userId), 'parsing');
});

// POST /api/ai/generate — stream AI-generated regional dataset via SSE
router.post(
  '/generate',
  requireAuth,
  requireAiAccess,
  validate(aiGenerateSchema),
  async (req, res) => {
    if (!env.GEMINI_API_KEY) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        error: { code: ErrorCode.INTERNAL_ERROR, message: 'AI service is not configured.' },
      });
      return;
    }

    const { prompt, mapRegionIds, countryName } = req.body as z.infer<typeof aiGenerateSchema>;
    const userId = req.session.userId!;
    await pumpAiStream(
      res,
      req,
      streamAiGenerate(prompt, mapRegionIds, countryName, userId),
      'generation',
    );
  },
);

// GET /api/ai/remaining — remaining daily parse requests for the authenticated user
router.get('/remaining', requireAuth, requireAiAccess, async (req, res, next) => {
  try {
    const remaining = await getAiParseRemaining(req.session.userId!);
    res.json({ success: true, data: { remaining } });
  } catch (error) {
    next(error);
  }
});

export const aiRoutes: ExpressRouter = router;
