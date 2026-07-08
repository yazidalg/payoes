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
import type { SubscriptionRow } from "@/lib/payments/types";

type SubscriptionsListPanelProps = {
  organizationId: string;
  embedded?: boolean;
  reloadKey?: number;
};

export function SubscriptionsListPanel({
  organizationId,
  embedded = false,
  reloadKey = 0,
}: SubscriptionsListPanelProps) {
  const fetchSubscriptions = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/subscriptions`
    );
    const data = (await response.json()) as { subscriptions?: SubscriptionRow[] };
    return data.subscriptions ?? [];
  }, [organizationId]);

  const { data: subscriptions } = useAsyncData(fetchSubscriptions, [
    organizationId,
    reloadKey,
  ]);

  return (
    <Card>
      {!embedded ? (
        <CardHeader>
          <CardTitle>Subscription list</CardTitle>
          <CardDescription>
            Click a subscription ID to open the detail page.
          </CardDescription>
        </CardHeader>
      ) : null}
      <CardContent className="px-0 pb-0">
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(subscriptions ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No subscriptions yet.
                  </td>
                </tr>
              ) : (
                (subscriptions ?? []).map((subscription) => (
                  <tr key={subscription.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/dashboard/payments/subscriptions/${subscription.id}`}
                        className="font-medium hover:underline"
                      >
                        {subscription.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {subscription.amount}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {subscription.customer_id ?? "N/A"}
                    </td>
                    <td className="px-4 py-3 capitalize">{subscription.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
