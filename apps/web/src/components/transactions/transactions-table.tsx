"use client";

import { useCallback } from "react";
import { useAsyncData } from "@/hooks/use-async-data";

type PaymentRow = {
  id: string;
  amount: string;
  asset: string;
  status: string;
  tx_hash: string | null;
  payer_address: string | null;
  customer_id: string | null;
  confirmed_at: string | null;
  created_at: string;
};

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

      <div className="overflow-hidden rounded-xl border border-border/80">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Payer</th>
              <th className="px-4 py-3 font-medium">Tx Hash</th>
              <th className="px-4 py-3 font-medium">Confirmed</th>
            </tr>
          </thead>
          <tbody>
            {(transactions ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No confirmed transactions yet.
                </td>
              </tr>
            ) : (
              (transactions ?? []).map((transaction) => (
                <tr key={transaction.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-mono text-xs">{transaction.id}</td>
                  <td className="px-4 py-3">
                    {transaction.amount} {transaction.asset}
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
    </div>
  );
}
