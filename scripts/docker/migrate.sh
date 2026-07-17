#!/bin/sh
set -eu

until pg_isready -h "${DATABASE_HOST:-postgres}" -p "${DATABASE_PORT:-5432}" -U "${DATABASE_USER:-payoes}" >/dev/null 2>&1; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done

if ! npx drizzle-kit migrate; then
  echo "Migration failed. Common causes:" >&2
  echo "  - POSTGRES_PASSWORD in .env does not match the existing Docker volume" >&2
  echo "  - Run: docker compose down -v && docker compose up -d" >&2
  echo "    (destroys local DB) or ALTER USER payoes WITH PASSWORD '...';" >&2
  exit 1
fi
