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
import type { PaymentRow } from "@/lib/payments/types";
import { formatAssetAmount } from "@/lib/payments/types";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import { CreditCard } from "@dub/ui/icons";

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
  const fetchPayments = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/payments`);
    const data = (await response.json()) as { payments?: PaymentRow[] };
    return data.payments ?? [];
  }, [organizationId]);

  const { data: payments } = useAsyncData(fetchPayments, [
    organizationId,
    reloadKey,
  ]);

  return (
    <Card>
      {!embedded ? (
        <CardHeader>
          <CardTitle>Payment intent list</CardTitle>
          <CardDescription>
            Click a payment intent ID to open the detail page.
          </CardDescription>
        </CardHeader>
      ) : null}
      <CardContent className={embedded ? "px-0 pb-0" : "px-0 pb-0"}>
        {(payments ?? []).length === 0 ? (
          <TableEmptyState
            title="No payment intents yet"
            description="Payment intents created from checkout or API will appear here."
            icon={<CreditCard className="size-4 text-neutral-700" />}
            className="border-0"
          />
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Payment intent</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-t border-border/60 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/dashboard/payments/${payment.id}`}
                        className="font-medium hover:underline"
                      >
                        {payment.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {formatAssetAmount(payment.amount, payment.settlement_asset)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {payment.customer_id ??
                        payment.payer_address?.slice(0, 10) ??
                        "N/A"}
                    </td>
                    <td className="px-4 py-3 capitalize">{payment.status}</td>
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
