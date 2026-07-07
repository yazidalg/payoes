export const PAYMENTS_TABS = [
  "payment-intents",
  "invoices",
  "payment-links",
  "subscriptions",
] as const;

export type PaymentsTab = (typeof PAYMENTS_TABS)[number];

export const PAYMENTS_TAB_LABELS: Record<PaymentsTab, string> = {
  "payment-intents": "Payment intents",
  invoices: "Invoices",
  "payment-links": "Payment links",
  subscriptions: "Subscriptions",
};

export function isPaymentsTab(value: string | null | undefined): value is PaymentsTab {
  return PAYMENTS_TABS.includes(value as PaymentsTab);
}

export function getPaymentsHubHref(tab: PaymentsTab = "payment-intents") {
  if (tab === "payment-intents") {
    return "/dashboard/payments";
  }

  return `/dashboard/payments?tab=${tab}`;
}

export function parsePaymentsTab(
  value: string | null | undefined
): PaymentsTab {
  if (isPaymentsTab(value)) {
    return value;
  }

  return "payment-intents";
}
