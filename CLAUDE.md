# Regionify — Claude Code Instructions

## Monorepo Overview

pnpm monorepo with three packages:

- `client/` — React frontend (`@regionify/client`)
- `server/` — Express backend (`@regionify/server`)
- `shared/` — Shared types, schemas, constants (`@regionify/shared`)

```
pnpm dev              # start client + server
pnpm build            # build all packages
pnpm typecheck        # type-check all packages
pnpm lint             # lint all packages
```

## Infrastructure

Docker services (run `docker compose up -d`):

- **PostgreSQL** — port 5432, main database
- **Redis** — port 6379, session storage

Dev setup:

1. Copy `server/.env.example` → `server/.env`
2. `docker compose up -d`
3. `pnpm --filter @regionify/server db:push`
4. `pnpm dev`

---

## Universal Rules

### Core

- Before creating or modifying code, always inspect existing files in the same domain/folder and follow the established structure, naming, and patterns exactly. Do not invent new patterns.
- Add comments only when the code's purpose is not immediately clear from its context or naming.
- Keep files small and focused; split when complexity grows.

### TypeScript

- No `any` without explicit justification.
- Explicit types for function params and return values.
- Use `type` for object shapes, `interface` for extendable contracts.
- Prefer `type` imports: `import { type MyType } from './types'`.
- Always handle `null` and `undefined` cases explicitly.

### Code Style

- Named exports preferred unless existing code uses default.
- Import order: enforced by `simple-import-sort/imports` ESLint rule.
- Destructure parameters in function signatures.
- Prefer early returns for cleaner code flow.

### Error Handling

- All async operations must handle errors.
- Never swallow errors silently.
- Use shared error types from `@regionify/shared`.

### Git

- **Never commit or push automatically.** Always ask for explicit permission before running `git commit` or `git push`.
- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Keep commits atomic and focused.
- When user says "commit", run git commands in terminal (not GitKraken MCP tools).

### Forbidden (All Packages)

- `any` without justification
- Introducing new patterns without precedent in the codebase
- Duplicating existing functionality
- Ignoring ESLint/TypeScript warnings
- Barrel files (`index.ts` that only re-export from other files in the same directory) — import directly from the source file

---

## Shared Package (`@regionify/shared`)

```
shared/src/
├── schemas/     # Zod validation schemas
├── types/       # TypeScript types and interfaces
└── constants/   # Shared constants (HttpStatus, ErrorCode)
```

```typescript
import { type UserPublic, type ApiResponse } from '@regionify/shared';
import { loginSchema, registerSchema } from '@regionify/shared/schemas';
import { HttpStatus, ErrorCode } from '@regionify/shared';
```

---

## Client (`@regionify/client`)

### Stack

- React 19 + TypeScript
- Vite (build tool)
- React Router (client-side routing)
- Ant Design UI with ConfigProvider theming
- Tailwind CSS v4
- Zustand (state management)
- i18next (internationalization)

### Structure

```
client/src/
├── api/           # API modules and endpoints
├── assets/        # Static assets
├── components/    # Reusable UI components
│   └── ui/        # Base UI: AppNavLink, Card, etc.
├── constants/     # Application constants
├── helpers/       # Shared utility functions
├── hooks/         # Custom React hooks
├── i18n/          # i18next setup
├── locales/       # Translation files (de, en, es, fr, pt, ru, zh)
├── pages/         # Route page components
├── store/         # Zustand stores (one per domain)
├── styles/        # Global styles and theme config
└── types/         # TypeScript interfaces / domain types
```

### Path Aliases

Use `@/` for all absolute imports within client:

```tsx
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
```

### Canonical References

- API: `client/src/api/`
- Error handling: `client/src/helpers/error.ts`
- Theme: `client/src/styles/antd-theme.ts`, `client/src/styles/tailwind.css`

### React

- Functional components only.
- Use React 19 features when applicable.
- Prefer composition over inheritance.
- Extract reusable logic into custom hooks in `src/hooks/`.
- Avoid prop drilling; use context or Zustand for deep data.

### Components

- Strongly typed `Props` type required for all components.
- Reuse existing components before creating new ones.
- Use components from `src/components/ui/` (e.g., `AppNavLink`, `Card`) for consistent app-wide UI patterns instead of raw HTML elements.
- Prefer Ant Design components over custom UI.
- Style with Tailwind utilities; avoid inline styles.
- Performance:
  - `useMemo` for expensive calculations.
  - `useCallback` for functions passed as props.
  - `React.memo` for pure presentational components when needed.
- Avoid inline object/array creation in JSX (causes re-renders).

### Styling

- Tailwind CSS v4 utility classes.
- Custom theme values in `src/styles/tailwind.css` via `@theme`.
- Ant Design theme in `src/styles/antd-theme.ts`.
- Primary color: `#18294D` (`bg-primary`, `text-primary` in Tailwind).
- Spacing tokens: `xs`, `sm`, `md`, `lg`, `xl`.

### API

- Endpoints defined only in `src/api/`. No hardcoded URLs elsewhere.
- Keep API logic isolated from UI components.
- Handle loading, error, and success states.

### State Management (Zustand)

- Store files in `src/store/` — one store per domain.
- Use the hook + selector pattern; keep selectors in `selectors.ts` per slice.

```tsx
import { create } from 'zustand';

type AuthState = {
  user: User | null;
  setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

- Derive computed values in components or hooks, not in the store.
- Use `persist` middleware for localStorage persistence when needed.
- Do not couple store logic with API calls directly.

### Hooks

- Always include all dependencies in `useEffect`, `useMemo`, `useCallback`.
- Clean up side effects in `useEffect` return.
- Avoid async functions directly in `useEffect`; define inside and call.
- Custom hooks must start with `use`.

### Performance

- Lazy load routes and heavy components with `React.lazy`.
- Prefer CSS over JavaScript for animations.

### Accessibility

- All images must have `alt` text.
- Interactive elements need keyboard support.
- Use semantic HTML elements.

### Forbidden (Client)

- Hardcoding API URLs outside `src/api/`
- Mixing UI, API, and state concerns in one file
- Inline styles (use Tailwind)
- Direct DOM manipulation (use React refs if needed)
- `useEffect` for derived state or synchronous logic (prefer `useMemo`, event handlers, or computed values)
- `overflow-hidden` unless required for layout specificity (rounded corners clipping, text truncation, viewport containment)

### Custom Best Practices (Client)

- Avoid deprecated Ant Design props; always use the latest recommended prop names.
- Prefer flexbox over CSS grid for simple layouts.
- Use flex grow (`flex-1`, `min-h-0`) instead of calculated heights (`h-[calc(...)]`) for container-fitting content.
- Prefer library types for handlers passed as props (e.g., `SelectProps['onChange']` instead of manual typing).
- Avoid inline object/array creation in JSX (causes re-renders); memoize with `useMemo` or define outside component.
- Prefer Ant Design components over native HTML elements (e.g., `Typography.Text` over `<span>`, `Typography.Title` over `<h1>`–`<h6>`).
- Use Ant Design `Flex` component instead of `<div>` with flex classes for flexbox layouts.
- Avoid nested ternaries for conditional rendering; use one of these patterns instead:
  1. Early return with `if` statements
  2. Mapped variable: `{ [key]: <Component /> }` structure
  3. Memoized variable (`useMemo`) with internal `if`/`return` logic
  4. Extract a presentational component with early returns for each branch
- In loops (`.map()`), avoid inline event handler functions; use `data-*` attributes on elements and a single memoized `useCallback` handler that reads `event.currentTarget.dataset`.
- Avoid declaring a variable holding static markup and rendering it in the same component — extract a presentational component instead.
- Refactor functions over ~100 lines into dedicated helpers or modules; keep UI components focused on composition and state.
- Keep UI and component files free of static content: move regex patterns, magic strings, and other literals to `constants/` (e.g., `constants/svgPath.ts`) and import where needed.

---

## Server (`@regionify/server`)

### Stack

- Node.js 22+ with native ES modules
- Express 5 + TypeScript 5.9
- Prisma ORM + PostgreSQL
- Redis for sessions
- Zod for validation
- Passport for auth
- Pino for logging
- Argon2id for password hashing

### Structure

```
server/
├── prisma/
│   └── schema.prisma
└── src/
    ├── auth/          # Passport strategies
    ├── config/        # env.ts — environment validation
    ├── db/            # Prisma client setup
    ├── lib/           # Utilities: logger, redis, password
    ├── middleware/    # Express middleware
    ├── repositories/  # Data access layer
    ├── routes/        # Route handlers (thin, delegate to services)
    ├── services/      # Business logic
    ├── types/         # TypeScript extensions (express.d.ts)
    ├── app.ts
    └── index.ts
```

### Path Aliases

Use `@/` within server for imports under `src/`. Always include the **`.js` extension** on these specifiers (native ESM; TypeScript resolves them to the corresponding `.ts` sources):

```typescript
import { db } from '@/db/index.js';
import { logger } from '@/lib/logger.js';
```

Import workspace and external packages normally (`@regionify/shared`, `express`, etc.) — no `.js` suffix on package specifiers.

`pnpm build` runs `tsc` then `tsc-alias` so emitted `dist/` code uses relative paths Node can load. Dev (`tsx watch`) resolves `@/` via `tsconfig.json` `paths`.

### API Design

All responses use `ApiResponse<T>` or `ApiError` from `@regionify/shared`:

```typescript
// Success
res.json({ success: true, data: { ... } });

// Error
res.status(400).json({
  success: false,
  error: { code: 'VALIDATION_ERROR', message: '...', details: { ... } },
});
```

- Use `HttpStatus` and `ErrorCode` constants from shared.
- Validate all inputs with Zod schemas from `@regionify/shared/schemas`.
- Route handlers must be thin — delegate to services.

### Error Handling (Server)

- Use `AppError` for expected errors.
- All async route handlers must catch and forward via `next(error)`.
- Log all errors with context using pino. Never expose stack traces in production.

```typescript
router.post('/endpoint', async (req, res, next) => {
  try {
    const result = await service.doSomething(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
```

### Database (Prisma)

- Schema in `prisma/schema.prisma`.
- Import Prisma client from `src/db/index.ts`.
- Use repository pattern for all database operations.
- Use `select` to limit returned fields.
- Use `$transaction` for multi-step operations.

Naming conventions:

- Models: PascalCase singular (`User`, `Session`)
- Fields: camelCase (`createdAt`)
- DB tables: snake_case via `@@map()` (`users`)
- DB columns: snake_case via `@map()` (`created_at`)

### Authentication

- Session-based with Redis store.
- Use `requireAuth` middleware for protected routes.
- Regenerate session on login (session fixation prevention).
- Rate limit auth endpoints separately.

### Security

- **Never** log sensitive data (passwords, tokens, sessions).
- **Always** validate and sanitize user input.
- **Never** expose internal error details in production.
- Use Argon2id for password hashing.
- Apply rate limiting to all routes.

### Logging

```typescript
import { logger } from '@/lib/logger.js';

logger.info({ userId, action: 'login' }, 'User logged in');
logger.error({ err, userId }, 'Failed to process request');
// Never: logger.info({ password }, '...') — no sensitive data
```

### Repository Pattern

Data access only, no business logic:

```typescript
export const userRepository = {
  async findById(id: string): Promise<UserRow | null> {
    return prisma.user.findUnique({ where: { id } });
  },
};
```

### Service Pattern

Business logic, coordinates repositories:

```typescript
export const authService = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const exists = await userRepository.existsByEmail(input.email);
    if (exists) throw new AppError(HttpStatus.CONFLICT, ErrorCode.EMAIL_ALREADY_EXISTS, '...');
    // ...
  },
};
```

### Middleware Order (app.ts)

1. `trust proxy`
2. Helmet (security headers)
3. CORS
4. Rate limiting
5. Body parsing
6. Cookie parser
7. Request logging
8. Session middleware
9. Passport initialization
10. Routes
11. 404 handler
12. Error handler

### Environment Variables

- All vars validated in `src/config/env.ts` with Zod.
- Never commit `.env`. Document all vars in `.env.example`.

### Forbidden (Server)

- `any` without justification
- String concatenation in SQL queries
- Logging passwords, tokens, or session data
- Exposing internal errors to clients
- Mixing data access and business logic in routes
- Hardcoding configuration values
- Importing without `.js` extension
- CommonJS syntax (`require`/`module.exports`)
- Blocking the event loop with synchronous operations

### Custom Best Practices (Server)

- Run database migrations in CI/CD **before** starting the new server to avoid requests hitting new code against an old schema.
- All API error responses (including known `AppError`s, not just unexpected errors) must include a dev-only `error.dev` block when `isDev` is true — request context (method, path, cookie names, session state) alongside the stack, since a deliberately-thrown `AppError`'s stack only points at its own throw site. Never include cookie or session _values_: names and presence only.

---

## AI Agent Behavior

- When the user says "it's best practice" or similar, automatically add the practice as a bullet point to the relevant **Custom Best Practices** section (Client or Server above).
- Keep entries concise and actionable.
