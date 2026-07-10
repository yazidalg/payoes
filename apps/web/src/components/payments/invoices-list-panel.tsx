"use client";

import { InvoicesTable } from "@/ui/invoices/invoices-table";

type InvoicesListPanelProps = {
  organizationId: string;
  embedded?: boolean;
  reloadKey?: number;
};

export function InvoicesListPanel({
  organizationId,
  embedded = false,
  reloadKey = 0,
}: InvoicesListPanelProps) {
  return (
    <InvoicesTable
      organizationId={organizationId}
      refreshKey={reloadKey}
      embedded={embedded}
    />
  );
}
