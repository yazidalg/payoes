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
import { formatAssetAmount, type PaymentLinkRow } from "@/lib/payments/types";

export function PaymentLinkDetailPanel({
  organizationId,
  linkId,
}: {
  organizationId: string;
  linkId: string;
}) {
  const fetchLink = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/payment-links/${linkId}`
    );
    const data = (await response.json()) as PaymentLinkRow & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Payment link not found");
    }

    return data;
  }, [organizationId, linkId]);

  const { data: link, error, isLoading } = useAsyncData(fetchLink, [
    organizationId,
    linkId,
  ]);

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Payment link copied");
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading payment link...</div>
    );
  }

  if (error || !link) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href={getPaymentsHubHref("payment-links")} />}
        >
          <ArrowLeftIcon />
          Back to payments
        </Button>
        <AlertBlock type="error">{error ?? "Payment link not found"}</AlertBlock>
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
          render={<Link href={getPaymentsHubHref("payment-links")} />}
        >
          <ArrowLeftIcon />
          Back to payments
        </Button>
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {link.id}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable payment link details.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Link</CardTitle>
            <CardDescription>Amount and status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span>{link.active ? "Active" : "Inactive"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Amount</span>
              <span>
                {formatAssetAmount(link.amount, link.settlement_asset)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Environment</span>
              <span className="capitalize">{link.environment}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Description</span>
              <span>{link.description ?? "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Share</CardTitle>
            <CardDescription>
              Each visit creates a new checkout session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="break-all font-mono text-xs">{link.url}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyLink(link.url)}
            >
              Copy payment link
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
