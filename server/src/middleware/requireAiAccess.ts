import { BADGE_DETAILS, ErrorCode, HttpStatus } from '@regionify/shared';
import { type NextFunction, type Request, type Response } from 'express';

import { AppError } from '@/middleware/errorHandler.js';
import { userRepository } from '@/repositories/userRepository.js';

export async function requireAiAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await userRepository.findById(req.session.userId!);
    if (!user || !BADGE_DETAILS[user.badge].limits.aiParser) {
      next(
        new AppError(
          HttpStatus.FORBIDDEN,
          ErrorCode.FORBIDDEN,
          'Explorer badge or higher required',
        ),
      );
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
