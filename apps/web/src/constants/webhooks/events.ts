export const WEBHOOK_EVENTS = [
  "payment.created",
  "payment.completed",
  "payment.failed",
  "payment.expired",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
