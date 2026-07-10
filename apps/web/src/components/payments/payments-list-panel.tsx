"use client";

import { PaymentsTable } from "@/ui/payments/payments-table";

type PaymentsListPanelProps = {
  organizationId: string;
  embedded?: boolean;
  reloadKey?: number;
};

export function PaymentsListPanel({
  organizationId,
  embedded = false,
  reloadKey = 0,
}: PaymentsListPanelProps) {
  return (
    <PaymentsTable
      organizationId={organizationId}
      refreshKey={reloadKey}
      embedded={embedded}
    />
  );
}
