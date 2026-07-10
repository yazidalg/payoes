"use client";

import { CheckoutSessionsTable } from "@/ui/checkout-sessions/checkout-sessions-table";

type CheckoutSessionsListPanelProps = {
  organizationId: string;
  embedded?: boolean;
  reloadKey?: number;
};

export function CheckoutSessionsListPanel({
  organizationId,
  embedded = false,
  reloadKey = 0,
}: CheckoutSessionsListPanelProps) {
  return (
    <CheckoutSessionsTable
      organizationId={organizationId}
      refreshKey={reloadKey}
      embedded={embedded}
    />
  );
}
