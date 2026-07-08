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
import { formatAssetRef, type PaymentRow } from "@/lib/payments/types";

export function PaymentDetailPanel({
  organizationId,
  paymentId,
}: {
  organizationId: string;
  paymentId: string;
}) {
  const fetchPayment = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/payments/${paymentId}`
    );
    const data = (await response.json()) as PaymentRow & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Payment not found");
    }

    return data;
  }, [organizationId, paymentId]);

  const { data: payment, error, isLoading } = useAsyncData(fetchPayment, [
    organizationId,
    paymentId,
  ]);

  async function copyCheckoutUrl(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Checkout link copied");
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading payment...</div>
    );
  }

  if (error || !payment) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href={getPaymentsHubHref("payment-intents")} />}
          >
          <ArrowLeftIcon />
          Back to payments
        </Button>
        <AlertBlock type="error">{error ?? "Payment not found"}</AlertBlock>
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
          render={<Link href={getPaymentsHubHref("payment-intents")} />}
          >
          <ArrowLeftIcon />
          Back to payments
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {payment.amount} {formatAssetRef(payment.settlement_asset)}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {payment.id}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment details</CardTitle>
          <CardDescription>Status, checkout link, and payer info.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1 capitalize">{payment.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-1">{payment.description ?? "N/A"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Settlement asset</dt>
              <dd className="mt-1">{formatAssetRef(payment.settlement_asset)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Allowed assets</dt>
              <dd className="mt-1">
                {payment.allowed_assets.map((asset) => asset.asset_code).join(", ") || "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid asset</dt>
              <dd className="mt-1">
                {formatAssetRef(payment.paid_asset ?? payment.settlement_asset)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="mt-1 font-mono text-xs">
                {payment.customer_id ? (
                  <Link
                    href={`/dashboard/customers/${payment.customer_id}`}
                    className="hover:underline"
                  >
                    {payment.customer_id}
                  </Link>
                ) : (
                  "N/A"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payer wallet</dt>
              <dd className="mt-1 font-mono text-xs break-all">
                {payment.payer_address ?? "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Transaction hash</dt>
              <dd className="mt-1 font-mono text-xs break-all">
                {payment.tx_hash ?? "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Confirmed</dt>
              <dd className="mt-1">
                {payment.confirmed_at
                  ? new Date(payment.confirmed_at).toLocaleString()
                  : "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Expires</dt>
              <dd className="mt-1">
                {payment.expires_at
                  ? new Date(payment.expires_at).toLocaleString()
                  : "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-1">
                {new Date(payment.created_at).toLocaleString()}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyCheckoutUrl(payment.checkout_url)}
            >
              Copy checkout link
            </Button>
            <Button
              type="button"
              variant="outline"
              render={
                <a href={payment.checkout_url} target="_blank" rel="noreferrer" />
              }
            >
              Open checkout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
