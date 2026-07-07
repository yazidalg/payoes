"use client";

import { useCallback } from "react";
import Link from "next/link";
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
import { getPaymentsHubHref } from "@/lib/navigation/payments-tabs";
import type { CheckoutSessionRow } from "@/lib/payments/types";

export function CheckoutSessionDetailPanel({
  organizationId,
  sessionId,
}: {
  organizationId: string;
  sessionId: string;
}) {
  const fetchSession = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/checkout-sessions/${sessionId}`
    );
    const data = (await response.json()) as CheckoutSessionRow & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Checkout session not found");
    }

    return data;
  }, [organizationId, sessionId]);

  const { data: session, error, isLoading } = useAsyncData(fetchSession, [
    organizationId,
    sessionId,
  ]);

  async function copyCheckoutUrl(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Checkout link copied");
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading checkout session...</div>
    );
  }

  if (error || !session) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href={getPaymentsHubHref()} />}
        >
          <ArrowLeftIcon />
          Back to payments
        </Button>
        <AlertBlock type="error">{error ?? "Checkout session not found"}</AlertBlock>
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
          render={<Link href={getPaymentsHubHref()} />}
        >
          <ArrowLeftIcon />
          Back to payments
        </Button>
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {session.id}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Checkout session details and hosted checkout link.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Status and linked payment intent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{session.status}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment status</span>
              <span className="capitalize">{session.payment_status ?? "N/A"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Amount</span>
              <span>
                {session.amount ?? "N/A"} {session.asset ?? ""}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-mono text-xs">{session.customer_id ?? "N/A"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment intent</span>
              {session.payment_intent_id ? (
                <Link
                  href={`/dashboard/payments/${session.payment_intent_id}`}
                  className="font-mono text-xs hover:underline"
                >
                  {session.payment_intent_id}
                </Link>
              ) : (
                <span>N/A</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>Share this link with your customer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="break-all font-mono text-xs">{session.checkout_url}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyCheckoutUrl(session.checkout_url)}
            >
              Copy checkout link
            </Button>
            {session.success_url ? (
              <p className="text-sm text-muted-foreground">
                Success URL: {session.success_url}
              </p>
            ) : null}
            {session.cancel_url ? (
              <p className="text-sm text-muted-foreground">
                Cancel URL: {session.cancel_url}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
