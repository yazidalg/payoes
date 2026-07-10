"use client";

import { PaymentLinksTable } from "@/ui/payment-links/payment-links-table";

type PaymentLinksListPanelProps = {
  organizationId: string;
  embedded?: boolean;
  reloadKey?: number;
};

export function PaymentLinksListPanel({
  organizationId,
  embedded = false,
  reloadKey = 0,
}: PaymentLinksListPanelProps) {
  return (
    <PaymentLinksTable
      organizationId={organizationId}
      refreshKey={reloadKey}
      embedded={embedded}
    />
  );
}
