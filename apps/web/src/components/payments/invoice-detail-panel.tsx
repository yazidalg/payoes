"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  DownloadIcon,
  EllipsisIcon,
  MailIcon,
  PencilIcon,
  UserRoundIcon,
} from "lucide-react";
import { toast } from "sonner";
import { InvoiceChangeCustomerDialog } from "@/components/invoices/invoice-change-customer-dialog";
import { InvoiceEditDialog } from "@/components/invoices/invoice-edit-dialog";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  canChangeInvoiceCustomer,
  canDeleteInvoice,
  canEditInvoice,
  canMarkInvoiceAsPaid,
  canResendInvoice,
  canVoidInvoice,
} from "@/lib/invoices/activity";
import { formatAmountWithUnit } from "@/lib/format/amount";
import { getPaymentsHubHref } from "@/lib/navigation/payments-tabs";
import type { InvoiceRow } from "@/lib/payments/types";
import { cn } from "@/lib/utils";

function InvoiceStatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        status === "paid" && "bg-emerald-100 text-emerald-800",
        status === "open" && "bg-amber-100 text-amber-800",
        status === "draft" && "bg-slate-100 text-slate-700",
        status === "void" && "bg-rose-100 text-rose-800"
      )}
    >
      {status}
    </span>
  );
}

function formatDetailDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

export function InvoiceDetailPanel({
  organizationId,
  invoiceId,
}: {
  organizationId: string;
  invoiceId: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [changeCustomerOpen, setChangeCustomerOpen] = useState(false);

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

  async function resendInvoice() {
    const response = await fetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}/send`,
      { method: "POST" }
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to resend invoice");
      return;
    }

    toast.success("Invoice sent");
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

  async function markAsPaid() {
    const response = await fetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}/mark-paid`,
      { method: "POST" }
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to mark invoice as paid");
      return;
    }

    toast.success("Invoice marked as paid");
    reload();
  }

  async function deleteInvoice() {
    const response = await fetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}`,
      { method: "DELETE" }
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to delete invoice");
      return;
    }

    toast.success("Invoice deleted");
    router.push(getPaymentsHubHref("invoices"));
  }

  function downloadPdf() {
    window.open(`/dashboard/payments/invoices/${invoiceId}/print`, "_blank", "noopener,noreferrer");
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

  const editable = canEditInvoice(invoice.status);
  const customerDisplay =
    invoice.customer_name ?? invoice.customer_email ?? invoice.customer_id ?? "N/A";

  return (
    <div className="space-y-6">
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

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {invoice.invoice_number}
              </h1>
              <InvoiceStatusPill status={invoice.status} />
            </div>
            <p className="text-3xl font-semibold tracking-tight">
              {formatAmountWithUnit(invoice.amount, invoice.currency_code)}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{invoice.id}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {editable ? (
              <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                <PencilIcon />
                Edit invoice
              </Button>
            ) : null}
            {canResendInvoice(invoice.status) ? (
              <Button type="button" variant="outline" onClick={() => void resendInvoice()}>
                <MailIcon />
                Resend invoice
              </Button>
            ) : null}
            {canChangeInvoiceCustomer(invoice.status) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setChangeCustomerOpen(true)}
              >
                <UserRoundIcon />
                Change customer
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={downloadPdf}>
              <DownloadIcon />
              Download PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline" size="icon" aria-label="More actions">
                    <EllipsisIcon />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                {invoice.status === "draft" ? (
                  <DropdownMenuItem onClick={() => void finalizeInvoice()}>
                    Finalize invoice
                  </DropdownMenuItem>
                ) : null}
                {canMarkInvoiceAsPaid(invoice.status) ? (
                  <DropdownMenuItem onClick={() => void markAsPaid()}>
                    Mark as paid
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={downloadPdf}>Download PDF</DropdownMenuItem>
                {canVoidInvoice(invoice.status) ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void voidInvoice()}>
                      Void invoice
                    </DropdownMenuItem>
                  </>
                ) : null}
                {canDeleteInvoice(invoice.status) ? (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => void deleteInvoice()}
                  >
                    Delete invoice
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Line items and invoice totals.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Qty</th>
                      <th className="px-4 py-3 font-medium">Unit price</th>
                      <th className="px-6 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                          {invoice.description ?? "No line items"}
                        </td>
                      </tr>
                    ) : (
                      invoice.items.map((item) => {
                        const lineTotal =
                          Number(item.unit_amount) * Number(item.quantity || "1");

                        return (
                          <tr key={`${item.description}-${item.unit_amount}`} className="border-t">
                            <td className="px-6 py-3">{item.description}</td>
                            <td className="px-4 py-3">{item.quantity}</td>
                            <td className="px-4 py-3">
                              {formatAmountWithUnit(item.unit_amount, invoice.currency_code)}
                            </td>
                            <td className="px-6 py-3 text-right">
                              {formatAmountWithUnit(
                                Number.isFinite(lineTotal) ? String(lineTotal) : item.unit_amount,
                                invoice.currency_code
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t px-6 py-4 text-sm">
                <span className="font-medium">Total</span>
                <span className="text-lg font-semibold">
                  {formatAmountWithUnit(invoice.amount, invoice.currency_code)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Billing metadata and linked resources.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Memo</dt>
                  <dd className="mt-1">{invoice.description ?? "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Currency</dt>
                  <dd className="mt-1">{invoice.currency_code}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="mt-1">{formatDetailDate(invoice.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Due</dt>
                  <dd className="mt-1">{formatDetailDate(invoice.due_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sent</dt>
                  <dd className="mt-1">{formatDetailDate(invoice.sent_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="mt-1">{formatDetailDate(invoice.paid_at)}</dd>
                </div>
                {invoice.subscription_id ? (
                  <div className="md:col-span-2">
                    <dt className="text-muted-foreground">Subscription</dt>
                    <dd className="mt-1">
                      <Link
                        href={`/dashboard/payments/subscriptions/${invoice.subscription_id}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {invoice.subscription_id}
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
              <CardDescription>Payment page and hosted invoice links.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoice.checkout_url ? (
                <>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Checkout URL
                    </p>
                    <p className="mt-1 break-all font-mono text-xs">{invoice.checkout_url}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Finalize this invoice to generate a checkout link.
                </p>
              )}

              {invoice.hosted_invoice_url ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Hosted invoice
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0"
                    render={
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    Open hosted invoice page
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
              <CardDescription>Who this invoice was issued to.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{customerDisplay}</p>
              {invoice.customer_email ? (
                <p className="text-muted-foreground">{invoice.customer_email}</p>
              ) : null}
              {invoice.customer_id ? (
                <Link
                  href={`/dashboard/customers/${invoice.customer_id}`}
                  className="font-mono text-xs hover:underline"
                >
                  {invoice.customer_id}
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Invoice lifecycle events.</CardDescription>
            </CardHeader>
            <CardContent>
              {invoice.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ol className="space-y-4">
                  {invoice.activity.map((event) => (
                    <li key={`${event.id}-${event.at}`} className="relative pl-4">
                      <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-sm">{event.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{event.at}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <InvoiceEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        organizationId={organizationId}
        invoice={invoice}
        onSaved={reload}
      />
      <InvoiceChangeCustomerDialog
        open={changeCustomerOpen}
        onOpenChange={setChangeCustomerOpen}
        organizationId={organizationId}
        invoice={invoice}
        onSaved={reload}
      />
    </div>
  );
}
