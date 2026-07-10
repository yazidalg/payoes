"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatAssetAmount, type CheckoutSessionRow } from "@/lib/payments/types";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import { CreditCard } from "@dub/ui/icons";

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
  const fetchSessions = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/checkout-sessions`,
    );
    const data = (await response.json()) as {
      checkout_sessions?: CheckoutSessionRow[];
    };
    return data.checkout_sessions ?? [];
  }, [organizationId]);

  const { data: sessions } = useAsyncData(fetchSessions, [
    organizationId,
    reloadKey,
  ]);

  const content =
    (sessions ?? []).length === 0 ? (
      <TableEmptyState
        title="No checkout sessions yet"
        description="Create a checkout session to start accepting payments."
        icon={<CreditCard className="size-4 text-neutral-700" />}
        className={embedded ? "border-0" : undefined}
      />
    ) : (
      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Session</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Payment intent</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(sessions ?? []).map((session) => (
              <tr
                key={session.id}
                className="border-t border-border/60 hover:bg-muted/30"
              >
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/dashboard/payments/checkout-sessions/${session.id}`}
                    className="font-medium hover:underline"
                  >
                    {session.id}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {session.amount
                    ? formatAssetAmount(session.amount, session.settlement_asset)
                    : "N/A"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {session.payment_intent_id ? (
                    <Link
                      href={`/dashboard/payments/${session.payment_intent_id}`}
                      className="hover:underline"
                    >
                      {session.payment_intent_id}
                    </Link>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="px-4 py-3 capitalize">{session.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  if (embedded) {
    return content;
  }

  return <div className="space-y-4">{content}</div>;
}
