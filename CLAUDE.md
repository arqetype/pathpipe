# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root (runs across all apps/packages via Turborepo)
pnpm dev           # Start Docker infra + all services
pnpm build         # Build everything in dependency order
pnpm lint          # Lint all packages
pnpm test          # Run all tests
pnpm check-types   # TypeScript strict check across all packages
pnpm format        # Prettier format all files

# Docker
pnpm docker:dev    # Start PostgreSQL + Maildev containers only
pnpm docker:down   # Stop containers

# Single app/package
pnpm dev --filter=api
pnpm dev --filter=web
pnpm test --filter=api
pnpm test --filter=web

# API tests (from apps/api)
pnpm test                      # unit tests (jest --passWithNoTests)
pnpm test:e2e                  # end-to-end (jest --config ./test/jest-e2e.json)
pnpm test:coverage
```

## Architecture

**Pathpipe** is a job application tracker. Monorepo managed by Turborepo + pnpm workspaces.

### Apps

- **`apps/api`** — NestJS 11 REST API on port 4000. PostgreSQL via TypeORM (`synchronize: true` in non-production). JWT auth stored in `auth-token` cookie.
- **`apps/web`** — Next.js 15 (App Router, Turbopack) frontend on port 3000.

### Packages

- **`packages/db`** — Shared TypeORM entities, DTOs (class-validator), query interfaces, and enum types. Imported by both apps as `@repo/db`. Exports via wildcard: `@repo/db/entities/user`, `@repo/db/dto/auth/sign-up`, `@repo/db/query/application`, etc.
- **`packages/email`** — React Email templates + Nodemailer utilities. Maildev on port 1080 (dev), React Email preview on 3011.
- **`packages/ui`** — Shared React component library built on Radix UI + Tailwind CSS.

### API module structure

Every feature is a NestJS module under `apps/api/src/`. Current modules: `auth`, `user`, `health`, `mailer`, `application`.

**Global setup (`app.module.ts`):**

- `JwtAuthGuard` is registered as a global `APP_GUARD` — all routes are protected by default.
- Use `@Public()` decorator to opt out of JWT protection.
- TypeORM entities must be registered in the `entities` array in `app.module.ts` to be active.

**Common decorators (`apps/api/src/common/decorators/`):**

- `@Public()` — marks a route as unauthenticated
- `@CurrentUser()` — injects the authenticated `User` entity from the JWT payload
- `@Roles()` — role-based access (used alongside role guards)

**Auth:** Passport strategies for Local, JWT, GitHub OAuth2, Google OAuth2. OTP (2FA) and email verification are first-class features.

### `packages/db` conventions

- **Entities**: TypeORM entities with `@PrimaryGeneratedColumn('uuid')`, `@CreateDateColumn`, `@UpdateDateColumn`. Soft delete uses `@DeleteDateColumn`.
- **DTOs**: Use `class-validator` decorators. Paired request/response classes in the same file (e.g., `SignUpDto` + `SignUpResponseDto`).
- **Queries**: Shared query/filter interfaces live in `src/query/` (e.g., `ApplicationsQuery`, `PaginatedApplications`).
- **Types**: Enums and plain types in `src/types/<domain>/`.

### Admin vs. user data access pattern

Controllers check `user.role === UserRole.ADMIN` and call the appropriate service method — admin methods have no ownership filter, user methods scope by `userId`. Example:

```ts
if (user.role === UserRole.ADMIN) return this.service.findById(id);
return this.service.findByIdAndUser(id, user.id);
```

Service methods throw `NotFoundException` (not `ForbiddenException`) when a record isn't found or doesn't belong to the user — this avoids leaking resource existence.

## Environment variables

Defined in `.env` at the repo root. Key variables:

```
NEST_PORT, NEST_DATABASE_HOST/PORT/USER/PASS/NAME
NEST_EMAIL_HOST/PORT/USER/PASS
NEST_JWT_SECRET, NEST_JWT_EXPIRATION_TIME
NEST_FRONT_URL
NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST
```
