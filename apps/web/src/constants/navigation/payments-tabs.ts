export const PAYMENTS_TABS = [
  "payment-intents",
  "checkout-sessions",
  "invoices",
  "payment-links",
] as const;

export type PaymentsTab = (typeof PAYMENTS_TABS)[number];

export const PAYMENTS_TAB_LABELS: Record<PaymentsTab, string> = {
  "payment-intents": "Payment intents",
  "checkout-sessions": "Checkout sessions",
  invoices: "Invoices",
  "payment-links": "Payment links",
};

export const DEFAULT_PAYMENTS_TAB: PaymentsTab = "payment-intents";
