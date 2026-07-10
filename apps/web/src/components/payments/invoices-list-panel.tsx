"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatAmountWithUnit } from "@/lib/format/amount";
import type { InvoiceRow } from "@/lib/payments/types";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import { FileContent } from "@dub/ui/icons";

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
  const fetchInvoices = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/invoices`);
    const data = (await response.json()) as { invoices?: InvoiceRow[] };
    return data.invoices ?? [];
  }, [organizationId]);

  const { data: invoices } = useAsyncData(fetchInvoices, [
    organizationId,
    reloadKey,
  ]);

  return (
    <Card>
      {!embedded ? (
        <CardHeader>
          <CardTitle>Invoice list</CardTitle>
          <CardDescription>Click an invoice ID to open the detail page.</CardDescription>
        </CardHeader>
      ) : null}
      <CardContent className="px-0 pb-0">
        {(invoices ?? []).length === 0 ? (
          <TableEmptyState
            title="No invoices yet"
            description="Invoices you create will appear here."
            icon={<FileContent className="size-4 text-neutral-700" />}
            className="border-0"
          />
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(invoices ?? []).map((invoice) => (
                  <tr key={invoice.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/dashboard/payments/invoices/${invoice.id}`}
                        className="font-medium hover:underline"
                      >
                        {invoice.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {formatAmountWithUnit(invoice.amount, invoice.currency_code)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {invoice.customer_id ?? "N/A"}
                    </td>
                    <td className="px-4 py-3 capitalize">{invoice.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
