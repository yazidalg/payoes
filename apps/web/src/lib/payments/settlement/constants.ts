export const REFUND_REASONS = {
  underpay: "underpay",
  wrong_asset: "wrong_asset",
  expired: "expired",
  quote_expired: "quote_expired",
  no_liquidity: "no_liquidity",
  slippage_exceeded: "slippage_exceeded",
  settle_failed: "settle_failed",
} as const;

export type RefundReason = (typeof REFUND_REASONS)[keyof typeof REFUND_REASONS];

export const SETTLEMENT_MAX_RETRIES = 3;
export const SETTLEMENT_RETRY_INTERVAL_MS = 30_000;
