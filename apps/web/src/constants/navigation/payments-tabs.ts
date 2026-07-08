export const PAYMENTS_TABS = [
  "payment-intents",
  "invoices",
  "payment-links",
] as const;

export type PaymentsTab = (typeof PAYMENTS_TABS)[number];

export const PAYMENTS_TAB_LABELS: Record<PaymentsTab, string> = {
  "payment-intents": "Payment intents",
  invoices: "Invoices",
  "payment-links": "Payment links",
};

export const DEFAULT_PAYMENTS_TAB: PaymentsTab = "payment-intents";
