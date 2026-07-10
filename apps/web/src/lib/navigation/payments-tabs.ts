import {
  DEFAULT_PAYMENTS_TAB,
  PAYMENTS_TABS,
  PAYMENTS_TAB_LABELS,
  type PaymentsTab,
} from "@/constants/navigation/payments-tabs";

export {
  DEFAULT_PAYMENTS_TAB,
  PAYMENTS_TABS,
  PAYMENTS_TAB_LABELS,
  type PaymentsTab,
};

export function isPaymentsTab(value: string | null | undefined): value is PaymentsTab {
  return PAYMENTS_TABS.includes(value as PaymentsTab);
}

export function getPaymentsHubHref(tab: PaymentsTab = DEFAULT_PAYMENTS_TAB) {
  if (tab === DEFAULT_PAYMENTS_TAB) {
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

  return DEFAULT_PAYMENTS_TAB;
}
