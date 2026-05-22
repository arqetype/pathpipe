# Pathpipe

<p align="center">
  <img src="https://i.imgur.com/pnEcoL9.jpeg" alt="Pathpipe logo" />
</p>

Job seeker tracking application built with a modern tech stack, designed for developers to manage their job applications, track progress, and receive suggestions based on their profiles.

## 🏗️ Architecture & Technology Stack

Pathpipe is designed as a production-oriented monorepo where each layer has a clear responsibility and a clear reason to exist.

### Why this architecture

| Choice                                     | Why we chose it                                                                                                                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NestJS API as the only source of truth** | All database access is centralized in the backend. This keeps business rules, validation, and authorization in one place and avoids duplicated logic between clients.                                                                                        |
| **Next.js frontend (App Router + React)**  | Gives a modern React developer experience with server-first patterns, nested routing, and strong performance defaults. In this project, all API interactions are done through **Server Actions** to keep credentials and sensitive calls on the server side. |
| **Independent BullMQ workers**             | Each worker (email, ATS) runs as a separate process consuming its own queue. This allows independent scaling, deployment, and failure isolation. BullMQ handles retries, delayed jobs, and concurrency.                                                      |
| **Turborepo monorepo**                     | Enables shared packages across apps (`types`, DB entities, DTOs, queue contracts, configs, email templates), reducing drift and enforcing end-to-end type safety.                                                                                            |
| **PostgreSQL**                             | Reliable relational database with strong consistency guarantees and mature tooling for transactional data.                                                                                                                                                   |
| **Redis + BullMQ**                         | Redis provides low-latency queue primitives; BullMQ adds robust job orchestration (retries, delayed jobs, concurrency controls).                                                                                                                             |
| **Docker infrastructure**                  | Standardizes local and production-like environments, making onboarding and deployment behavior more predictable.                                                                                                                                             |

### Core stack snapshot

- **Backend**: NestJS + TypeORM + PostgreSQL + JWT + Nodemailer
- **Frontend**: Next.js + React + Tailwind CSS + Radix UI + React Hook Form
- **Workers/Queues**: BullMQ workers + Redis
- **Monorepo/Tooling**: Turborepo + pnpm workspaces + TypeScript + Docker Compose

## 🧑‍💻 Development Environment

The development workflow is designed to be plug-and-play using Docker and Turborepo:

- **Frontend**: http://localhost:3000 (Next.js with Turbopack)
- **Backend API**: http://localhost:4000 (NestJS with auto-reload)
- **Workers**:
  - Email Worker: consumes email-sender queue
  - ATS Worker: consumes ATS sync queue
- **Database**: PostgreSQL on port 5432
- **Email Development Server**: http://localhost:1080 (MailDev for receiving emails, configured in the `@repo/email` package)
- **Email Template Preview**: http://localhost:1081 (React Email development server, configured in the `@repo/email` package)

All services start and stop automatically via `pnpm run dev`.

## 📜 Available Scripts

### Root Level Commands

- `pnpm run dev` - Start all development services (frontend, backend, email servers and docker infrastructure)
- `pnpm run build` - Build all packages using Turborepo
- `pnpm run test` - Run unit tests across all packages
- `pnpm run lint` - Lint entire repository
- `pnpm run format` - Auto-format code using Prettier
- `pnpm run check-types` - Strict TypeScript type checking

### Docker Management

- `pnpm run docker:dev` - Start development infrastructure (database)
- `pnpm run docker:down` - Stop development infrastructure

### Running Workers

Workers can be run individually or all at once via `pnpm run dev`:

```bash
# Run all services (api, web, workers)
pnpm run dev

# Run specific worker
pnpm --filter worker run dev:email   # Email worker
pnpm --filter worker run dev:ats     # ATS worker
```

Each worker is an independent BullMQ consumer that processes jobs from its dedicated queue. Workers share the same infrastructure (Redis, config) but can be scaled independently.

## 🧠 Features & Capabilities

### Current Features

- **User Authentication** - JWT-based authentication with email verification
- **User Management** - Registration, login, and profile management
- **Email System** - Transactional emails with beautiful templates
- **Health Monitoring** - API health checks and status endpoints
- **Type Safety** - End-to-end TypeScript for robust development

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20
- **Docker** and **Docker Compose**
- **pnpm** (recommended package manager)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/arqetype/pathpipe.git
   cd pathpipe
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

   If you don't have pnpm installed:

   ```bash
   npm install -g pnpm
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.development.local
   cp .env.example .env.production.local
   # Edit each file with your configuration
   ```

   `.env.example` at the repository root is the template source of truth.
   Development uses root `.env.development.local`, and deployment uses root `.env.production.local`.

4. **Start the development environment**
   ```bash
   pnpm run dev
   ```

## 🧪 Testing

- **Unit Tests**: `pnpm run test`
- **E2E Tests**: `pnpm run test:e2e` (in apps/api)
- **Test Coverage**: `pnpm run test:coverage`
- **Watch Mode**: `pnpm run test:watch`

## 🤝 Contributing

This project welcomes contributions of all kinds - features, refactoring, documentation improvements, and bug fixes.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

Please ensure your code follows the existing style and passes all checks:

```bash
pnpm run lint
pnpm run check-types
pnpm run test
```

## 📚 Philosophy & Goals

The project emphasizes:

- **Developer Experience** - Fast feedback loops and clear abstractions
- **Code Quality** - Type safety, testing, and consistent formatting
- **Modularity** - Loosely coupled packages for easy extension
- **Performance** - Efficient builds and runtime optimization

---

Built with ❤ by [Arqetype](https://github.com/arqetype). 🇫🇷 Made in France.
