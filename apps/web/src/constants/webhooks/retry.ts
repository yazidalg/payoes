/** Maximum delivery attempts per webhook event (initial + retries). */
export const WEBHOOK_MAX_ATTEMPTS = 5;

/** Delay before each retry after a failed attempt (index = attempt number - 1). */
export const WEBHOOK_RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  24 * 60 * 60_000,
] as const;

/** Reject webhook signatures older than this many seconds. */
export const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300;
