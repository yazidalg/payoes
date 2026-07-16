# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/email/package.json apps/email/
COPY packages/sdk/package.json packages/sdk/
COPY packages/ui/package.json packages/ui/
COPY packages/utils/package.json packages/utils/
COPY packages/tailwind-config/package.json packages/tailwind-config/
COPY packages/tsconfig/package.json packages/tsconfig/

RUN npm ci

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_DOCS_URL=http://localhost:3001
ARG NEXT_PUBLIC_GITHUB_URL=https://github.com/yazidalg/payoes

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_DOCS_URL=$NEXT_PUBLIC_DOCS_URL \
    NEXT_PUBLIC_GITHUB_URL=$NEXT_PUBLIC_GITHUB_URL

RUN npm run build

FROM base AS migrate

RUN apk add --no-cache postgresql-client

COPY --from=builder /app ./

ENV NODE_ENV=production

WORKDIR /app/apps/web

CMD ["sh", "-c", "until pg_isready -h \"${DATABASE_HOST:-postgres}\" -p \"${DATABASE_PORT:-5432}\" -U \"${DATABASE_USER:-payoes}\" >/dev/null 2>&1; do echo 'Waiting for PostgreSQL...'; sleep 1; done; npx drizzle-kit migrate"]

FROM base AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/scripts/docker/web-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
