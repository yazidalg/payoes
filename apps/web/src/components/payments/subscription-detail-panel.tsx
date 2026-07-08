"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatTokenAmount } from "@/lib/format/amount";
import { getPaymentsHubHref } from "@/lib/navigation/payments-tabs";
import type { SubscriptionRow } from "@/lib/payments/types";

export function SubscriptionDetailPanel({
  organizationId,
  subscriptionId,
}: {
  organizationId: string;
  subscriptionId: string;
}) {
  const router = useRouter();

  const fetchSubscription = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/subscriptions/${subscriptionId}`
    );
    const data = (await response.json()) as SubscriptionRow & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Subscription not found");
    }

    return data;
  }, [organizationId, subscriptionId]);

  const { data: subscription, error, isLoading, reload } = useAsyncData(
    fetchSubscription,
    [organizationId, subscriptionId]
  );

  async function billSubscription() {
    const response = await fetch(
      `/api/organizations/${organizationId}/subscriptions/${subscriptionId}/bill`,
      { method: "POST" }
    );
    const data = (await response.json()) as {
      error?: string;
      invoice?: { id: string };
    };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to bill subscription");
      return;
    }

    toast.success("Invoice created for this billing period");
    reload();

    if (data.invoice?.id) {
      router.push(`/dashboard/payments/invoices/${data.invoice.id}`);
    }
  }

  async function cancelSubscription() {
    const response = await fetch(
      `/api/organizations/${organizationId}/subscriptions/${subscriptionId}/cancel`,
      { method: "POST" }
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to cancel subscription");
      return;
    }

    toast.success("Subscription canceled");
    reload();
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading subscription...</div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href={getPaymentsHubHref("subscriptions")} />}
        >
          <ArrowLeftIcon />
          Back to payments
        </Button>
        <AlertBlock type="error">{error ?? "Subscription not found"}</AlertBlock>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href={getPaymentsHubHref("subscriptions")} />}
        >
          <ArrowLeftIcon />
          Back to payments
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {subscription.id}
            </h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              Status: {subscription.status}
            </p>
          </div>
          <div className="flex gap-2">
            {subscription.status !== "canceled" ? (
              <>
                <Button type="button" onClick={() => void billSubscription()}>
                  Bill now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void cancelSubscription()}
                >
                  Cancel subscription
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Billing period and customer details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Amount</span>
            <span>
              {formatTokenAmount(subscription.amount)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Interval</span>
            <span className="capitalize">
              Every {subscription.interval_count} {subscription.interval}
              {subscription.interval_count > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-mono text-xs">
              {subscription.customer_id ?? "N/A"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Current period</span>
            <span>
              {new Date(subscription.current_period_start).toLocaleDateString()} -{" "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
