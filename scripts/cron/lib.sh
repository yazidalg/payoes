#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${PAYOES_CRON_ENV:-$SCRIPT_DIR/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

PAYOES_URL="${PAYOES_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"
CURL_BIN="${CURL_BIN:-curl}"
LOG_DIR="${LOG_DIR:-$SCRIPT_DIR/logs}"

require_config() {
  if [[ -z "$PAYOES_URL" ]]; then
    echo "PAYOES_URL is not set. Copy .env.example to .env and configure it." >&2
    exit 1
  fi

  if [[ -z "$CRON_SECRET" ]]; then
    echo "CRON_SECRET is not set. Copy .env.example to .env and configure it." >&2
    exit 1
  fi
}

payoes_cron_post() {
  local path="$1"
  local label="$2"

  require_config

  local url="${PAYOES_URL%/}${path}"
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  echo "[$timestamp] POST $path ($label)"

  local response
  local status

  response="$(
    "$CURL_BIN" -sS -w "\n%{http_code}" -X POST "$url" \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json"
  )"

  status="${response##*$'\n'}"
  response="${response%$'\n'*}"

  echo "[$timestamp] HTTP $status"
  echo "[$timestamp] Body: $response"

  if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
    echo "[$timestamp] Cron job failed: $label" >&2
    exit 1
  fi
}

ensure_log_dir() {
  mkdir -p "$LOG_DIR"
}
