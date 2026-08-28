import { RedisStore } from 'connect-redis';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Request } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import { pinoHttp } from 'pino-http';

import { configurePassport } from '@/auth/passport.js';
import { env, isProd } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import { redis } from '@/lib/redis.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import { generalLimiter } from '@/middleware/rateLimiter.js';
import { apiRoutes } from '@/routes/index.js';
import { setupWebClient } from '@/web/setupWebClient.js';

function toOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

function deriveApiOriginFromClientUrl(clientUrl: string): string | null {
  try {
    const parsed = new URL(clientUrl);
    if (parsed.hostname.startsWith('api.')) return null;

    const hostnameWithoutWww = parsed.hostname.replace(/^www\./, '');
    const apiUrl = new URL(parsed.origin);
    apiUrl.hostname = `api.${hostnameWithoutWww}`;

    return apiUrl.origin;
  } catch {
    return null;
  }
}

export function createApp(): express.Application {
  const app = express();

  // Trust proxy (required for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security headers
  const connectSrcValues = new Set<string>(["'self'", toOrigin(env.CLIENT_URL)]);
  if (env.API_URL) {
    connectSrcValues.add(toOrigin(env.API_URL));
  }

  const derivedApiOrigin = deriveApiOriginFromClientUrl(env.CLIENT_URL);
  if (derivedApiOrigin) {
    connectSrcValues.add(derivedApiOrigin);
  }

  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              baseUri: ["'self'"],
              fontSrc: ["'self'", 'https:', 'data:'],
              formAction: ["'self'"],
              frameAncestors: ["'self'"],
              frameSrc: ["'self'", 'https://news.google.com', 'https://www.google.com'],
              imgSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              scriptSrc: ["'self'", 'https://news.google.com'],
              scriptSrcAttr: ["'none'"],
              workerSrc: ["'self'", 'blob:'],
              styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
              connectSrc: [...connectSrcValues, 'https://news.google.com'],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS
  const allowedHeaders = ['Content-Type', 'X-Requested-With'];
  if (!isProd) {
    // Dev-only: the client's ngrok shim sends this header to bypass ngrok-free's
    // "Visit Site" interstitial. Production never sees it.
    allowedHeaders.push('ngrok-skip-browser-warning');
  }
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders,
    }),
  );

  // Rate limiting (apply to all routes)
  app.use(generalLimiter);

  // Body parsing (store raw body for Paddle webhook signature verification).
  app.use(
    express.json({
      // Historical / multi-period map datasets easily exceed 100kb once region×year rows are included.
      limit: '2mb',
      verify: (req: Request, _res, buf: Buffer) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());

  // Request logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req: Request) => req.url === '/health',
      },
    }),
  );

  // Session store with Redis (sliding expiration: TTL resets on each request)
  const store = new RedisStore({
    client: redis,
    prefix: 'regionify:session:',
    disableTouch: false,
  });

  app.use(
    session({
      store,
      name: 'regionify.sid',
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      // Sliding expiration: resend cookie + refresh Redis TTL on every request
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: isProd || new URL(env.CLIENT_URL).hostname !== 'localhost',
        sameSite: isProd
          ? 'strict'
          : new URL(env.CLIENT_URL).hostname !== 'localhost'
            ? 'none'
            : 'lax',
        maxAge: env.SESSION_MAX_AGE,
      },
    }),
  );

  // Passport
  configurePassport();
  app.use(passport.initialize());

  // API routes mounted at root: nginx proxies api.<host> → 127.0.0.1:PORT preserving URI,
  // so requests reach Express as /auth/..., /projects/..., /payments/webhook, etc.
  app.use(apiRoutes);

  setupWebClient(app);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
