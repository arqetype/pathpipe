FROM node:22-slim AS base

FROM base AS builder

WORKDIR /app
RUN npm install -g pnpm@9.15.9 turbo
COPY . .
RUN turbo prune worker --docker

FROM base AS installer
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers
RUN npm install -g pnpm@9.15.9
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter worker exec playwright install --with-deps chromium
COPY --from=builder /app/out/full .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker
USER worker
COPY --from=installer --chown=worker:nodejs /app .

CMD ["node", "apps/worker/dist/index.js"]
