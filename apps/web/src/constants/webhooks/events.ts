export const WEBHOOK_EVENTS = [
  "payment.created",
  "payment.completed",
  "payment.failed",
  "payment.expired",
  "payment.refunded",
  "payment.settlement_failed",
] as const;

export const WEBHOOK_TEST_EVENT = "webhook.test" as const;

export const ALL_WEBHOOK_EVENT_TYPES = [
  ...WEBHOOK_EVENTS,
  WEBHOOK_TEST_EVENT,
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
