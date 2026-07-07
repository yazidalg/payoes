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
import { getPaymentsHubHref } from "@/lib/navigation/payments-tabs";
import type { InvoiceRow } from "@/lib/payments/types";

export function InvoiceDetailPanel({
  organizationId,
  invoiceId,
}: {
  organizationId: string;
  invoiceId: string;
}) {
  const router = useRouter();

  const fetchInvoice = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}`
    );
    const data = (await response.json()) as InvoiceRow & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Invoice not found");
    }

    return data;
  }, [organizationId, invoiceId]);

  const { data: invoice, error, isLoading, reload } = useAsyncData(fetchInvoice, [
    organizationId,
    invoiceId,
  ]);

  async function copyCheckoutUrl(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Checkout link copied");
  }

  async function finalizeInvoice() {
    const response = await fetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}/finalize`,
      { method: "POST" }
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to finalize invoice");
      return;
    }

    toast.success("Invoice finalized");
    reload();
  }

  async function voidInvoice() {
    const response = await fetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}/void`,
      { method: "POST" }
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to void invoice");
      return;
    }

    toast.success("Invoice voided");
    reload();
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading invoice...</div>;
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href={getPaymentsHubHref("invoices")} />}
        >
          <ArrowLeftIcon />
          Back to payments
        </Button>
        <AlertBlock type="error">{error ?? "Invoice not found"}</AlertBlock>
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
          render={<Link href={getPaymentsHubHref("invoices")} />}
        >
          <ArrowLeftIcon />
          Back to payments
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {invoice.id}
            </h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              Status: {invoice.status}
            </p>
          </div>
          <div className="flex gap-2">
            {invoice.status === "draft" ? (
              <Button type="button" onClick={() => void finalizeInvoice()}>
                Finalize invoice
              </Button>
            ) : null}
            {invoice.status === "draft" || invoice.status === "open" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void voidInvoice()}
              >
                Void invoice
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
            <CardDescription>Amount and customer details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Amount</span>
              <span>
                {invoice.amount} {invoice.asset}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-mono text-xs">{invoice.customer_id ?? "N/A"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Due date</span>
              <span>{invoice.due_at ? new Date(invoice.due_at).toLocaleString() : "N/A"}</span>
            </div>
            {invoice.subscription_id ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subscription</span>
                <Link
                  href={`/dashboard/payments/subscriptions/${invoice.subscription_id}`}
                  className="font-mono text-xs hover:underline"
                >
                  {invoice.subscription_id}
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>Available after the invoice is finalized.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.checkout_url ? (
              <>
                <p className="break-all font-mono text-xs">{invoice.checkout_url}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyCheckoutUrl(invoice.checkout_url!)}
                >
                  Copy checkout link
                </Button>
                {invoice.checkout_session_id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      router.push(
                        `/dashboard/payments/checkout-sessions/${invoice.checkout_session_id}`
                      )
                    }
                  >
                    View checkout session
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Finalize this invoice to generate a checkout link.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
