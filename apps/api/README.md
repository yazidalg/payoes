# Payoes API (Go)

Canonical HTTP API for Payoes. The Next.js routes under `apps/web/src/app/api` remain in the repo but are unused once the web app points at this service via `NEXT_PUBLIC_API_URL`.

## Run locally

```bash
# From repo root
docker compose up -d postgres minio minio-init

cp apps/api/.env.example apps/api/.env
# Or reuse apps/web/.env.local (loaded automatically by the process)

npm run dev:api
```

Health check: `GET http://localhost:8080/healthz`

## Docker

```bash
docker compose up -d --build api
```

The `api` service uses the same Postgres and MinIO containers. Set `DATABASE_URL` to `postgresql://payoes:payoes@postgres:5432/payoes` inside Compose (already overridden in `docker-compose.yml`).

## Database migrations

Migrations stay in `apps/web/drizzle`. Run them as before:

```bash
npm run db:migrate
```

## Cron

Point `PAYOES_URL` at this API:

```bash
PAYOES_URL=http://localhost:8080
```

See `scripts/cron/`.
