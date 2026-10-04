FROM node:22-slim AS base

FROM base AS builder

WORKDIR /app
RUN npm install -g pnpm@9.15.9 turbo
COPY . .
RUN turbo prune worker --docker

FROM base AS installer
WORKDIR /app
RUN npm install -g pnpm@9.15.9
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/out/full .
RUN pnpm build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker
USER worker
COPY --from=installer --chown=worker:nodejs /app .

CMD ["node", "apps/worker/dist/index.js"]
