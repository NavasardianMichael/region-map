import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file only in development (production uses env_file in docker-compose)
if (process.env.NODE_ENV !== 'production') {
  const envFile = '.env.development.local';
  dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });
}

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Session
  SESSION_SECRET: z.string().min(32),
  SESSION_MAX_AGE: z.coerce.number().default(604800000), // 7 days

  // CORS
  CORS_ORIGINS: z.string().transform((val) => val.split(',')),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().url(),

  // Client URL
  CLIENT_URL: z.string().url(),

  // Public API base URL (used for CSP connect-src; defaults to CLIENT_URL)
  API_URL: z.string().url().optional(),

  // Static client directory (set in Docker image for SSR HTML shells)
  CLIENT_STATIC_DIR: z.string().optional(),

  // Static marketing directory (Astro SSG output; root-relative URLs, fallthrough if no file)
  MARKETING_STATIC_DIR: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(10),

  // Mail API (base URL without trailing slash)
  MAIL_API_URL: z.string().url(),
  MAIL_API_KEY: z.string(),

  // Google Gemini (AI parser feature — Explorer plan and above)
  GEMINI_API_KEY: z.string().optional(),

  // Paddle Billing (one-time checkouts; webhook for transaction.completed)
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  PADDLE_PRICE_ID_EXPLORER: z.string().optional(),
  PADDLE_PRICE_ID_CHRONOGRAPHER: z.string().optional(),
  PADDLE_SANDBOX: z.string().optional(), // "true" = sandbox API, omit or any other value = live

  // Google Search Console
  GOOGLE_SITE_VERIFICATION: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
