FROM node:20-alpine AS base

FROM base AS builder

RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm turbo wait-on
COPY . .
RUN wait-on ${NEXT_API_URL}
RUN turbo prune web --docker

FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/out/full .
RUN pnpm build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
USER nextjs
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

CMD ["node", "apps/web/server.js"]
