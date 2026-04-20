# Weaver

## ⚡️ Overview

Our aim is to overhaul the Weaver platform into a mini Applicant Tracking System (ATS) designed for recruiters. This next-gen system will simplify job openings, candidate pipelines, and team workflows to make hiring effective, efficient and more human-centric.

## 🏗️ Architecture & Technology Stack

**Monorepo Structure** - Orchestrated by Turborepo for efficient development workflows

- **TypeScript** everywhere (frontend, backend, tooling)
- **pnpm** for package management with workspace support
- **Docker Compose** for reproducible development environment
- **Prettier** for consistent code formatting
- **Node.js >= 20** required

### Backend Stack

- **NestJS** - Progressive Node.js framework for scalable server-side applications
- **TypeORM** - Object-relational mapping with TypeScript support
- **PostgreSQL** - Primary database for production-ready data persistence
- **JWT Authentication** - Secure token-based authentication system
- **Nodemailer** - Email service integration for notifications

### Frontend Stack

- **Next.js 15** - React framework with App Router and Turbopack
- **React 19** - Latest React version with concurrent features
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Radix UI** - Unstyled, accessible UI components
- **React Hook Form** - Performant form handling with validation
- **PostHog** - Product analytics and feature flags

### Development Tooling

- **ESLint** - Static code analysis and linting
- **Jest** - JavaScript testing framework with coverage reports
- **React Email** - Email template development with React components
- **MailDev** - Local email testing server

## 📁 Project Structure

```
weaver/
├── apps/                          # Application packages
│   ├── api/                       # NestJS backend API
│   │   ├── src/
│   │   │   ├── auth/             # Authentication module (JWT, guards, strategies)
│   │   │   ├── user/             # User management service
│   │   │   ├── health/           # Health check endpoints
│   │   │   ├── mailer/           # Email service integration
│   │   │   ├── verification/     # Email/OTP verification system
│   │   │   └── common/           # Shared utilities and decorators
│   │   └── test/                 # E2E tests
│   └── web/                      # Next.js frontend application
│       ├── src/
│       │   ├── app/             # App Router pages and layouts
│       │   ├── components/      # React components (header, forms, providers)
│       │   ├── actions/         # Server actions for data mutations
│       │   └── lib/             # Utility functions and configurations
│       └── components.json      # shadcn/ui configuration
├── packages/                     # Shared packages
│   ├── db/                      # Database entities and DTOs
│   │   └── src/
│   │       ├── entities/        # TypeORM entities (User,etc.)
│   │       └── dto/             # Data transfer objects
│   ├── email/                   # Email templates and mailer utilities
│   │   ├── src/
│   │   │   ├── templates/       # React Email templates
│   │   │   └── components/      # Reusable email components
│   │   └── mailer.tsx           # Email service configuration
│   ├── ui/                      # Shared UI component library
│   │   └── src/
│   │       ├── components/      # Reusable React components
│   │       ├── hooks/           # Custom React hooks
│   │       └── styles/          # Global styles and theme
│   └── config packages/         # Shared configuration
│       ├── eslint-config/       # ESLint configurations per environment
│       ├── jest-config/         # Jest configurations
│       ├── prettier-config/     # Prettier configurations
│       └── typescript-config/   # TypeScript configurations
└── docker-compose.dev.yml       # Development environment setup
```

## 🧑‍💻 Development Environment

The development workflow is designed to be plug-and-play using Docker and Turborepo:

- **Frontend**: http://localhost:3000 (Next.js with Turbopack)
- **Backend API**: http://localhost:4000 (NestJS with auto-reload)
- **Database**: PostgreSQL on port 5432
- **Email Development Server**: http://localhost:1080 (MailDev for receiving emails, configured in the `@repo/email` package)
- **Email Template Preview**: http://localhost:1081 (React Email development server, configured in the `@repo/email` package)

All services start and stop automatically via `pnpm run dev`.

## 📜 Available Scripts

### Root Level Commands

- `pnpm run dev` - Start all development services (frontend, backend, email servers)
- `pnpm run build` - Build all packages using Turborepo
- `pnpm run test` - Run unit tests across all packages
- `pnpm run lint` - Lint entire repository
- `pnpm run format` - Auto-format code using Prettier
- `pnpm run check-types` - Strict TypeScript type checking

### Docker Management

- `pnpm run docker:dev` - Start development infrastructure (database)
- `pnpm run docker:down` - Stop development infrastructure

## 🧠 Features & Capabilities

### Current Features

- **User Authentication** - JWT-based authentication with email verification
- **User Management** - Registration, login, and profile management
- **Email System** - Transactional emails with beautiful templates
- **Health Monitoring** - API health checks and status endpoints
- **Type Safety** - End-to-end TypeScript for robust development

<!-- ### Planned Features

- **AI Meal Analysis** - Automatic calorie estimation from text or image input
- **Personalized Recommendations** - AI-driven suggestions based on user history
- **Nutrition Tracking** - Comprehensive macro and micronutrient tracking
- **Goal Setting** - Custom calorie and nutrition goals
- **Progress Analytics** - Data visualization and trend analysis -->

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20
- **Docker** and **Docker Compose**
- **pnpm** (recommended package manager)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/arqetype/weaver.git
   cd weaver
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
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development environment**
   ```bash
   pnpm run dev
   ```

The application will be available at:

- Frontend: http://localhost:3000
- API: http://localhost:4000
- Email preview: http://localhost:1081

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

TODO: write a little text

The project emphasizes:

- **Developer Experience** - Fast feedback loops and clear abstractions
- **Code Quality** - Type safety, testing, and consistent formatting
- **Modularity** - Loosely coupled packages for easy extension
- **Performance** - Efficient builds and runtime optimization

---

Built with ❤ by [Arqetype](https://github.com/arqetype). 🇫🇷 Made in France.
