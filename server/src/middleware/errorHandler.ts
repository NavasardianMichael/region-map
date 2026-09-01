import { ErrorCode, type ErrorCodeType, HttpStatus } from '@regionify/shared';
import { type NextFunction, type Request, type Response } from 'express';

import { isDev } from '@/config/env.js';
import { logger } from '@/lib/logger.js';

function isPayloadTooLargeError(err: Error): boolean {
  const withType = err as Error & { type?: string; status?: number; statusCode?: number };
  return (
    withType.type === 'entity.too.large' ||
    withType.status === HttpStatus.PAYLOAD_TOO_LARGE ||
    withType.statusCode === HttpStatus.PAYLOAD_TOO_LARGE
  );
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCodeType,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

type DevErrorContext = {
  name: string;
  /** Real message even when the client-facing one is masked (unexpected errors). */
  originalMessage: string;
  method: string;
  path: string;
  cookieNames: string[];
  hasSession: boolean;
  sessionKeys: string[];
  isAuthenticated: boolean;
  stack?: string;
};

/**
 * Request context attached to error responses in dev only. An AppError's stack just points at
 * its own throw site, so the session/cookie state is what actually explains auth failures.
 * Cookie and session *values* are deliberately omitted — they carry session credentials.
 */
function buildDevContext(err: Error, req: Request): DevErrorContext {
  const cookies = req.cookies as Record<string, unknown> | undefined;

  return {
    name: err.name,
    originalMessage: err.message,
    method: req.method,
    path: req.originalUrl,
    cookieNames: Object.keys(cookies ?? {}),
    hasSession: req.session != null,
    sessionKeys: req.session ? Object.keys(req.session) : [],
    isAuthenticated: Boolean(req.session?.userId),
    stack: err.stack,
  };
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Log the error
  logger.error({ err }, 'Request error');

  const dev = isDev ? { dev: buildDevContext(err, req) } : {};

  // Handle known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
        ...dev,
      },
    });
    return;
  }

  if (isPayloadTooLargeError(err)) {
    res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      success: false,
      error: {
        code: ErrorCode.PAYLOAD_TOO_LARGE,
        message: 'Request body is too large',
        ...dev,
      },
    });
    return;
  }

  // Handle unexpected errors
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      ...dev,
    },
  });
}
