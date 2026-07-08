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
import type { PaymentRow } from "@/lib/payments/types";
import { formatAssetAmount } from "@/lib/payments/types";

export function TransactionsTable({ organizationId }: { organizationId: string }) {
  const fetchTransactions = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/payments`);
    const data = (await response.json()) as { payments?: PaymentRow[] };
    return (data.payments ?? []).filter((payment) => payment.status === "completed");
  }, [organizationId]);

  const { data: transactions } = useAsyncData(fetchTransactions, [organizationId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirmed blockchain payments for your organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction list</CardTitle>
          <CardDescription>
            Click a payment ID to open the full payment detail page.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Settlement</th>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Payer</th>
                  <th className="px-4 py-3 font-medium">Tx Hash</th>
                  <th className="px-4 py-3 font-medium">Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {(transactions ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No confirmed transactions yet.
                    </td>
                  </tr>
                ) : (
                  (transactions ?? []).map((transaction) => (
                    <tr key={transaction.id} className="border-t border-border/60">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/dashboard/payments/${transaction.id}`}
                          className="hover:underline"
                        >
                          {transaction.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {formatAssetAmount(
                          transaction.quoted_paid_amount ?? transaction.amount,
                          transaction.paid_asset ?? transaction.settlement_asset
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {transaction.quoted_settlement_amount
                          ? formatAssetAmount(
                              transaction.quoted_settlement_amount,
                              transaction.settlement_asset
                            )
                          : formatAssetAmount(
                              transaction.amount,
                              transaction.settlement_asset
                            )}
                      </td>
                      <td className="px-4 py-3">
                        {transaction.pricing_amount && transaction.pricing_currency
                          ? formatAmountWithUnit(
                              transaction.pricing_amount,
                              transaction.pricing_currency
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {transaction.payer_address
                          ? `${transaction.payer_address.slice(0, 10)}...`
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {transaction.tx_hash
                          ? `${transaction.tx_hash.slice(0, 8)}...`
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {transaction.confirmed_at
                          ? new Date(transaction.confirmed_at).toLocaleString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
