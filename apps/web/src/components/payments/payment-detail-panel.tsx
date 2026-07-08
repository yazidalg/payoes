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
import { formatAssetAmount, formatAssetRef, type PaymentRow } from "@/lib/payments/types";

function formatPaidAmount(payment: PaymentRow) {
  const amount = payment.quoted_paid_amount ?? payment.amount;
  const asset = payment.paid_asset ?? payment.settlement_asset;
  return formatAssetAmount(amount, asset);
}

function formatSettlementTarget(payment: PaymentRow) {
  if (payment.pricing_amount && payment.pricing_currency) {
    return formatAmountWithUnit(payment.pricing_amount, payment.pricing_currency);
  }

  if (payment.quoted_settlement_amount) {
    return formatAssetAmount(
      payment.quoted_settlement_amount,
      payment.settlement_asset
    );
  }

  return formatAssetAmount(payment.amount, payment.settlement_asset);
}

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
          <p className="text-sm text-muted-foreground">Customer paid</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {formatPaidAmount(payment)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Settlement target: {formatSettlementTarget(payment)}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {payment.id}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment details</CardTitle>
          <CardDescription>Status, payer info, and payment metadata.</CardDescription>
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
              <dt className="text-muted-foreground">Invoice total</dt>
              <dd className="mt-1">
                {payment.pricing_amount && payment.pricing_currency
                  ? formatAmountWithUnit(
                      payment.pricing_amount,
                      payment.pricing_currency
                    )
                  : "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid amount</dt>
              <dd className="mt-1">{formatPaidAmount(payment)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Settlement amount</dt>
              <dd className="mt-1">
                {payment.quoted_settlement_amount
                  ? formatAssetAmount(
                      payment.quoted_settlement_amount,
                      payment.settlement_asset
                    )
                  : "N/A"}
              </dd>
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

          {payment.checkout_url && payment.status === "pending" ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyCheckoutUrl(payment.checkout_url!)}
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
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
