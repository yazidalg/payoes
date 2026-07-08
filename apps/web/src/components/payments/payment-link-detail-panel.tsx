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
import { formatAmountWithUnit } from "@/lib/format/amount";
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
              <span className="text-muted-foreground">Total</span>
              <span>
                {link.currency_code
                  ? formatAmountWithUnit(link.amount, link.currency_code)
                  : formatAssetAmount(link.amount, link.settlement_asset)}
              </span>
            </div>
            {link.currency_code ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Currency</span>
                <span>{link.currency_code}</span>
              </div>
            ) : null}
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

        {link.items && link.items.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Line items shown on the hosted page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {link.items.map((item, index) => (
                <div
                  key={`${item.description}-${index}`}
                  className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-muted-foreground">
                      {item.quantity} ×{" "}
                      {link.currency_code
                        ? formatAmountWithUnit(item.unit_amount, link.currency_code)
                        : item.unit_amount}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium">
                    {link.currency_code
                      ? formatAmountWithUnit(item.line_amount, link.currency_code)
                      : item.line_amount}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Customer collection</CardTitle>
            <CardDescription>Fields requested before checkout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {link.customer_collection.collect_customer_name
                ? "Collects customer name"
                : "Does not collect customer name"}
            </p>
            <p>
              {link.customer_collection.collect_business_name
                ? "Collects business name"
                : "Does not collect business name"}
            </p>
            <p>
              {link.customer_collection.collect_customer_address
                ? "Collects billing address"
                : "Does not collect address"}
            </p>
            <p>
              {link.customer_collection.require_phone_number
                ? "Requires phone number"
                : "Does not require phone number"}
            </p>
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
