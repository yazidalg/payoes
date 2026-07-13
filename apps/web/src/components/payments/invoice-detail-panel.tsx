"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InvoiceChangeCustomerDialog } from "@/components/invoices/invoice-change-customer-dialog";
import { InvoiceEditDialog } from "@/components/invoices/invoice-edit-dialog";
import { AlertBlock } from "@/components/shared/alert-block";
import { useAsyncData } from "@/hooks/use-async-data";
import { toastInvoiceSentToCustomer } from "@/lib/invoices/send-toast";
import {
  canChangeInvoiceCustomer,
  canDeleteInvoice,
  canEditInvoice,
  canMarkInvoiceAsPaid,
  canResendInvoice,
  canVoidInvoice,
} from "@/lib/invoices/activity";
import { getPaymentsHubHref } from "@/lib/navigation/payments-tabs";
import type { InvoiceRow } from "@/lib/payments/types";
import { InvoiceDetailSkeleton } from "@/ui/payments/invoice-detail-skeleton";
import { InvoiceDetailStats } from "@/ui/payments/invoice-detail-stats";
import { InvoiceDetailsColumn } from "@/ui/payments/invoice-details-column";
import {
  InvoiceActivitySection,
  InvoiceLineItemsSection,
  InvoiceMetadataSection,
} from "@/ui/payments/invoice-sections";
import { getInvoiceRowStatusLabel, getInvoiceRowStatusVariant } from "@/ui/payments/payment-formatters";
import { ShareLinkSection } from "@/ui/payments/share-link-section";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import {
  Button,
  MenuItem,
  Popover,
  StatusBadge,
  useCopyToClipboard,
} from "@dub/ui";
import {
  ChevronRight,
  Copy,
  Dots,
  Download,
  Envelope,
  FileContent,
  Link4,
  PenWriting,
  User,
} from "@dub/ui/icons";
import { Command } from "cmdk";
import { toast } from "sonner";

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
    const response = await apiFetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}`,
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

  const finalizeInvoice = useCallback(async () => {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}/finalize`,
      { method: "POST" },
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to finalize invoice");
      return;
    }

    toast.success("Invoice finalized");
    reload();
  }, [organizationId, invoiceId, reload]);

  const resendInvoice = useCallback(async () => {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}/send`,
      { method: "POST" },
    );
    const data = (await response.json()) as {
      error?: string;
      email_delivered?: boolean;
    };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to resend invoice");
      return;
    }

    toastInvoiceSentToCustomer(data, { resend: true });
    reload();
  }, [organizationId, invoiceId, reload]);

  const voidInvoice = useCallback(async () => {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}/void`,
      { method: "POST" },
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to void invoice");
      return;
    }

    toast.success("Invoice voided");
    reload();
  }, [organizationId, invoiceId, reload]);

  const markAsPaid = useCallback(async () => {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}/mark-paid`,
      { method: "POST" },
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to mark invoice as paid");
      return;
    }

    toast.success("Invoice marked as paid");
    reload();
  }, [organizationId, invoiceId, reload]);

  const deleteInvoice = useCallback(async () => {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/invoices/${invoiceId}`,
      { method: "DELETE" },
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to delete invoice");
      return;
    }

    toast.success("Invoice deleted");
    router.push(getPaymentsHubHref("invoices"));
  }, [organizationId, invoiceId, router]);

  const downloadPdf = useCallback(() => {
    window.open(
      `/dashboard/payments/invoices/${invoiceId}/print`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [invoiceId]);

  const headerOverride = useMemo(() => {
    if (!invoice) {
      return null;
    }

    return {
      title: (
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={getPaymentsHubHref("invoices")}
            aria-label="Back to invoices"
            title="Back to invoices"
            className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
          >
            <FileContent className="size-4" />
          </Link>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <span className="text-content-emphasis min-w-0 truncate text-base font-semibold">
            {invoice.invoice_number}
          </span>
          <StatusBadge variant={getInvoiceRowStatusVariant(invoice)} icon={null}>
            {getInvoiceRowStatusLabel(invoice)}
          </StatusBadge>
        </div>
      ),
      controls: (
        <InvoiceDetailControls
          invoice={invoice}
          onEdit={() => setEditOpen(true)}
          onChangeCustomer={() => setChangeCustomerOpen(true)}
          onResend={resendInvoice}
          onDownload={downloadPdf}
          onFinalize={finalizeInvoice}
          onMarkPaid={markAsPaid}
          onVoid={voidInvoice}
          onDelete={deleteInvoice}
        />
      ),
    };
  }, [
    invoice,
    resendInvoice,
    downloadPdf,
    finalizeInvoice,
    markAsPaid,
    voidInvoice,
    deleteInvoice,
  ]);

  useSetDashboardPageHeader(headerOverride);

  if (isLoading) {
    return <InvoiceDetailSkeleton />;
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <Link
          href={getPaymentsHubHref("invoices")}
          className="bg-bg-subtle hover:bg-bg-emphasis inline-flex size-8 items-center justify-center rounded-lg transition-colors"
        >
          <FileContent className="size-4" />
        </Link>
        <AlertBlock type="error">{error ?? "Invoice not found"}</AlertBlock>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-10">
        <InvoiceDetailStats invoice={invoice} />

        <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] grid grid-cols-1 gap-6">
          <div className="@3xl/page:order-2">
            <InvoiceDetailsColumn invoice={invoice} />
          </div>

          <div className="@3xl/page:order-1 space-y-6">
            <InvoiceLineItemsSection invoice={invoice} />
            <InvoiceMetadataSection invoice={invoice} />

            {invoice.checkout_url ? (
              <ShareLinkSection
                title="Checkout"
                description="Share the hosted checkout page with your customer."
                url={invoice.checkout_url}
                copyLabel="Copy checkout link"
                copySuccessMessage="Checkout link copied"
                openLabel="Open checkout"
              >
                {invoice.checkout_session_id ? (
                  <Button
                    type="button"
                    variant="secondary"
                    text="View checkout session"
                    className="h-9 w-auto"
                    onClick={() =>
                      router.push(
                        `/dashboard/payments/checkout-sessions/${invoice.checkout_session_id}`,
                      )
                    }
                  />
                ) : null}
              </ShareLinkSection>
            ) : (
              <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
                <div className="border-border-subtle border-b px-4 py-3">
                  <h2 className="text-content-emphasis text-sm font-semibold">Checkout</h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Share the hosted checkout page with your customer.
                  </p>
                </div>
                <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
                  <p className="text-sm text-neutral-500">
                    Finalize this invoice to generate a checkout link.
                  </p>
                </div>
              </div>
            )}

            <InvoiceActivitySection invoice={invoice} />
          </div>
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
    </>
  );
}

function InvoiceDetailControls({
  invoice,
  onEdit,
  onChangeCustomer,
  onResend,
  onDownload,
  onFinalize,
  onMarkPaid,
  onVoid,
  onDelete,
}: {
  invoice: InvoiceRow;
  onEdit: () => void;
  onChangeCustomer: () => void;
  onResend: () => void;
  onDownload: () => void;
  onFinalize: () => void;
  onMarkPaid: () => void;
  onVoid: () => void;
  onDelete: () => void;
}) {
  const editable = canEditInvoice(invoice.status);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {editable ? (
        <Button
          type="button"
          variant="outline"
          text="Edit invoice"
          className="h-9"
          icon={<PenWriting className="size-4" />}
          onClick={onEdit}
        />
      ) : null}
      {canResendInvoice(invoice.status) ? (
        <Button
          type="button"
          variant="outline"
          text="Resend email"
          className="h-9"
          icon={<Envelope className="size-4" />}
          onClick={() => void onResend()}
        />
      ) : null}
      {canChangeInvoiceCustomer(invoice.status) ? (
        <Button
          type="button"
          variant="outline"
          text="Change customer"
          className="h-9"
          icon={<User className="size-4" />}
          onClick={onChangeCustomer}
        />
      ) : null}
      <Button
        type="button"
        variant="outline"
        text="Download PDF"
        className="h-9"
        icon={<Download className="size-4" />}
        onClick={onDownload}
      />
      <InvoiceDetailMenu
        invoice={invoice}
        onResend={onResend}
        onFinalize={onFinalize}
        onMarkPaid={onMarkPaid}
        onDownload={onDownload}
        onVoid={onVoid}
        onDelete={onDelete}
      />
    </div>
  );
}

function InvoiceDetailMenu({
  invoice,
  onResend,
  onFinalize,
  onMarkPaid,
  onDownload,
  onVoid,
  onDelete,
}: {
  invoice: InvoiceRow;
  onResend: () => void;
  onFinalize: () => void;
  onMarkPaid: () => void;
  onDownload: () => void;
  onVoid: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
            <MenuItem
              as={Command.Item}
              icon={Copy}
              onSelect={() => {
                toast.promise(copyToClipboard(invoice.id), {
                  success: "Copied invoice ID",
                });
                setIsOpen(false);
              }}
            >
              Copy invoice ID
            </MenuItem>
            {invoice.checkout_url ? (
              <MenuItem
                as={Command.Item}
                icon={Link4}
                onSelect={() => {
                  toast.promise(copyToClipboard(invoice.checkout_url!), {
                    success: "Checkout link copied",
                  });
                  setIsOpen(false);
                }}
              >
                Copy checkout link
              </MenuItem>
            ) : null}
            {canResendInvoice(invoice.status) ? (
              <MenuItem
                as={Command.Item}
                icon={Envelope}
                onSelect={() => {
                  onResend();
                  setIsOpen(false);
                }}
              >
                Resend email
              </MenuItem>
            ) : null}
            {invoice.status === "draft" ? (
              <MenuItem
                as={Command.Item}
                onSelect={() => {
                  onFinalize();
                  setIsOpen(false);
                }}
              >
                Finalize invoice
              </MenuItem>
            ) : null}
            {canMarkInvoiceAsPaid(invoice.status) ? (
              <MenuItem
                as={Command.Item}
                onSelect={() => {
                  onMarkPaid();
                  setIsOpen(false);
                }}
              >
                Mark as paid
              </MenuItem>
            ) : null}
            <MenuItem
              as={Command.Item}
              icon={Download}
              onSelect={() => {
                onDownload();
                setIsOpen(false);
              }}
            >
              Download PDF
            </MenuItem>
            {canVoidInvoice(invoice.status) ? (
              <MenuItem
                as={Command.Item}
                onSelect={() => {
                  onVoid();
                  setIsOpen(false);
                }}
              >
                Void invoice
              </MenuItem>
            ) : null}
            {canDeleteInvoice(invoice.status) ? (
              <MenuItem
                as={Command.Item}
                onSelect={() => {
                  onDelete();
                  setIsOpen(false);
                }}
              >
                Delete invoice
              </MenuItem>
            ) : null}
          </Command.List>
        </Command>
      }
      align="end"
    >
      <Button
        type="button"
        className="h-9 whitespace-nowrap px-2"
        variant="outline"
        icon={<Dots className="h-4 w-4 shrink-0" />}
      />
    </Popover>
  );
}
