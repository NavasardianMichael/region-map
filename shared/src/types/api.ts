export type ApiResponse<T = unknown> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
};

export type ApiResult<T = unknown> = ApiResponse<T> | ApiError;

// Error codes for client handling
export const ErrorCode = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Email verification
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  // Badge (tier) limit errors
  PROJECT_LIMIT_REACHED: 'PROJECT_LIMIT_REACHED',
  SESSION_LIMIT_REACHED: 'SESSION_LIMIT_REACHED',

  // Project state errors
  PROJECT_LOCKED: 'PROJECT_LOCKED',

  // General errors
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
