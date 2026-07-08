"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { CustomerPicker } from "@/components/invoices/customer-picker";
import { InvoiceCurrencyPicker } from "@/components/invoices/invoice-currency-picker";
import { InvoiceDueDatePicker } from "@/components/invoices/invoice-due-date-picker";
import { InvoicePreviewPanel } from "@/components/invoices/invoice-preview-panel";
import { InvoiceReviewDialog } from "@/components/invoices/invoice-review-dialog";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  calculateInvoiceTotal,
  calculateTotalQuantity,
  formatInvoiceAmount,
  lineItemAmount,
} from "@/lib/invoices/amount";
import { DEFAULT_INVOICE_CURRENCY_CODE } from "@/lib/invoices/currencies";
import type { InvoicePresentation } from "@/lib/invoices/presentation";
import type { CustomerOption } from "@/lib/payments/types";
import { cn } from "@/lib/utils";

type DraftInvoiceItem = {
  id: string;
  description: string;
  quantity: string;
  unitAmount: string;
};

function createDraftItem(): DraftInvoiceItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitAmount: "0",
  };
}

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setHours(23, 59, 59, 999);
  return date;
}

function buildDraftPresentation(input: {
  organizationName: string;
  organizationLogoUrl: string | null;
  organizationLogoInitials: string;
  environment: "sandbox" | "production";
  customer: CustomerOption | null;
  currencyCode: string;
  description: string;
  dueAt: Date;
  items: DraftInvoiceItem[];
}): InvoicePresentation {
  const draftItems = input.items.map((item) => {
    const hasValues =
      item.description.trim() && Number(item.unitAmount) > 0 && Number(item.quantity) > 0;

    return {
      id: item.id,
      description: item.description.trim() || "Untitled item",
      quantity: item.quantity || "1",
      unitAmount: item.unitAmount || "0",
      lineAmount: hasValues
        ? lineItemAmount(
            {
              description: item.description,
              quantity: item.quantity || "1",
              unitAmount: item.unitAmount,
            },
            input.currencyCode
          )
        : "0",
    };
  });

  const validItems = input.items.filter(
    (item) => item.description.trim() && Number(item.unitAmount) > 0
  );

  const amount =
    validItems.length > 0
      ? calculateInvoiceTotal(
          validItems.map((item) => ({
            description: item.description,
            quantity: item.quantity || "1",
            unitAmount: item.unitAmount,
          })),
          input.currencyCode
        )
      : "0";

  return {
    invoiceNumber: "DRAFT",
    status: "draft",
    amount,
    asset: input.currencyCode,
    currencyCode: input.currencyCode,
    description: input.description.trim() || null,
    dueAt: input.dueAt,
    createdAt: new Date(),
    environmentLabel:
      input.environment === "production" ? "Production" : "Sandbox test mode",
    organization: {
      name: input.organizationName,
      logoUrl: input.organizationLogoUrl,
      logoInitials: input.organizationLogoInitials,
    },
    customer: {
      name: input.customer?.name ?? null,
      email: input.customer?.email ?? null,
    },
    items: draftItems,
    hostedInvoiceUrl: null,
    checkoutUrl: null,
  };
}

export function CreateInvoicePage({
  organizationId,
  organizationName,
  organizationLogoUrl,
  organizationLogoInitials,
  environment,
}: {
  organizationId: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  organizationLogoInitials: string;
  environment: "sandbox" | "production";
}) {
  const router = useRouter();
  const fetchCustomers = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/customers`);
    const data = (await response.json()) as { customers?: CustomerOption[] };
    return data.customers ?? [];
  }, [organizationId]);

  const { data: customers } = useAsyncData(fetchCustomers, [organizationId]);

  const [customerId, setCustomerId] = useState("");
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_INVOICE_CURRENCY_CODE);
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<Date>(defaultDueDate);
  const [items, setItems] = useState<DraftInvoiceItem[]>([createDraftItem()]);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedCustomer =
    customers?.find((customer) => customer.id === customerId) ?? null;

  const presentation = useMemo(
    () =>
      buildDraftPresentation({
        organizationName,
        organizationLogoUrl,
        organizationLogoInitials,
        environment,
        customer: selectedCustomer,
        currencyCode,
        description,
        dueAt,
        items,
      }),
    [
      organizationName,
      organizationLogoUrl,
      organizationLogoInitials,
      environment,
      selectedCustomer,
      currencyCode,
      description,
      dueAt,
      items,
    ]
  );

  const totalQuantity = calculateTotalQuantity(
    items.map((item) => ({
      description: item.description,
      quantity: item.quantity || "1",
      unitAmount: item.unitAmount,
    }))
  );

  function updateItem(id: string, patch: Partial<DraftInvoiceItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function validateForm() {
    if (!customerId) {
      return "Select a customer";
    }

    if (!selectedCustomer?.email) {
      return "Selected customer must have an email address";
    }

    const validItems = items.filter(
      (item) => item.description.trim() && Number(item.unitAmount) > 0
    );

    if (validItems.length === 0) {
      return "Add at least one invoice item with a description and unit price";
    }

    return null;
  }

  async function handleSend() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSending(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/invoices/send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          currency_code: currencyCode,
          description: description || null,
          due_at: dueAt.toISOString(),
          items: items
            .filter((item) => item.description.trim() && Number(item.unitAmount) > 0)
            .map((item) => ({
              description: item.description.trim(),
              quantity: item.quantity || "1",
              unit_amount: item.unitAmount,
            })),
        }),
      }
    );

    const data = (await response.json()) as {
      error?: string;
      id?: string;
      email_delivered?: boolean;
      email_logged?: boolean;
    };

    setIsSending(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to send invoice");
      return;
    }

    if (data.email_logged) {
      toast.message("Invoice prepared. Email logged because SMTP is not configured.");
    } else {
      toast.success("Invoice sent to customer");
    }

    setReviewOpen(false);
    router.push(`/dashboard/payments/invoices/${data.id}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/payments?tab=invoices"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">
              Create {environment === "production" ? "" : "test "}invoice
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose a currency, build line items, preview, then send to your customer.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => {
            const validationError = validateForm();
            if (validationError) {
              setError(validationError);
              return;
            }
            setError(null);
            setReviewOpen(true);
          }}
        >
          Review invoice
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="overflow-auto border-r px-4 py-6 sm:px-6">
          {error ? <AlertBlock type="error" className="mb-4">{error}</AlertBlock> : null}

          <div className="space-y-6">
            <section className="space-y-2">
              <Label>Customer</Label>
              <CustomerPicker
                customers={customers ?? []}
                value={customerId}
                onChange={setCustomerId}
              />
            </section>

            <section className="space-y-2">
              <InvoiceCurrencyPicker
                value={currencyCode}
                onChange={setCurrencyCode}
              />
              <p className="text-xs text-muted-foreground">
                Customers can pay with any enabled Stellar token at checkout. The
                invoice total stays in this currency.
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((current) => [...current, createDraftItem()])}
                >
                  <PlusIcon className="size-4" />
                  Add item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="grid gap-3">
                      <Input
                        placeholder="Item description"
                        value={item.description}
                        onChange={(event) =>
                          updateItem(item.id, { description: event.target.value })
                        }
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(item.id, { quantity: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Unit price ({currencyCode})
                          </Label>
                          <Input
                            value={item.unitAmount}
                            onChange={(event) =>
                              updateItem(item.id, { unitAmount: event.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    {items.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((entry) => entry.id !== item.id)
                          )
                        }
                      >
                        <Trash2Icon className="size-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">
                  Total: {formatInvoiceAmount(presentation.amount, currencyCode)}
                </p>
                <p className="text-muted-foreground">Total quantity: {totalQuantity}</p>
              </div>
            </section>

            <section className="space-y-2">
              <Label htmlFor="invoice-memo">Memo</Label>
              <Input
                id="invoice-memo"
                placeholder="Optional note on the invoice"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </section>

            <section className="space-y-2">
              <Label htmlFor="invoice-due-date">Due date</Label>
              <InvoiceDueDatePicker value={dueAt} onChange={setDueAt} />
            </section>
          </div>
        </div>

        <div className="min-h-[480px] p-4 sm:p-6">
          <InvoicePreviewPanel
            presentation={presentation}
            environment={environment}
          />
        </div>
      </div>

      <InvoiceReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        presentation={presentation}
        customer={selectedCustomer}
        isSending={isSending}
        onSend={() => void handleSend()}
      />
    </div>
  );
}
