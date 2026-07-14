"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { InvoiceCurrencyPicker } from "@/components/invoices/invoice-currency-picker";
import { InvoiceDueDatePicker } from "@/components/invoices/invoice-due-date-picker";
import { InvoicePreviewPanel } from "@/components/invoices/invoice-preview-panel";
import { InvoiceReviewDialog } from "@/components/invoices/invoice-review-dialog";
import { CreateCustomerSheet } from "@/components/customers/create-customer-sheet";
import {
  calculateInvoiceTotal,
  calculateTotalQuantity,
  formatInvoiceAmount,
  lineItemAmount,
} from "@/lib/invoices/amount";
import { DEFAULT_INVOICE_CURRENCY_CODE } from "@/lib/invoices/currencies";
import type { InvoicePresentation } from "@/lib/invoices/presentation";
import type { CustomerOption } from "@/lib/payments/types";
import {
  createInvoiceInlineValidators,
  createInvoiceRequiredValidators,
  customerEmailRequiredError,
  type CreateInvoiceFormValues,
  type InvoiceLineItemValues,
} from "@/lib/validation/create-invoice-validation";
import {
  getVisibleInlineError,
  useSplitFormValidation,
  useTouchedFields,
} from "@/lib/validation/form-validation";
import { CustomerCombobox } from "@/ui/invoices/customer-combobox";
import { InvoiceCreateShell } from "@/ui/invoices/invoice-create-shell";
import { InvoiceLineItemsEditor } from "@/ui/invoices/invoice-line-items-editor";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { FormTextarea } from "@/ui/forms/form-textarea";
import { ValidatedSubmitButton } from "@/ui/forms/validated-submit-button";
import { useAsyncData } from "@/hooks/use-async-data";
import { cn } from "@dub/utils";

type CreateInvoiceField = keyof CreateInvoiceFormValues | "customerEmail";

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  items: InvoiceLineItemValues[];
}): InvoicePresentation {
  const draftItems = input.items.map((item) => {
    const hasValues =
      item.description.trim() &&
      Number(item.unitAmount) > 0 &&
      Number(item.quantity) > 0;

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
            input.currencyCode,
          )
        : "0",
    };
  });

  const validItems = input.items.filter(
    (item) => item.description.trim() && Number(item.unitAmount) > 0,
  );

  const amount =
    validItems.length > 0
      ? calculateInvoiceTotal(
          validItems.map((item) => ({
            description: item.description,
            quantity: item.quantity || "1",
            unitAmount: item.unitAmount,
          })),
          input.currencyCode,
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

  const { data: customers, reload: reloadCustomers } = useAsyncData(fetchCustomers, [organizationId]);

  const [customerId, setCustomerId] = useState("");
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_INVOICE_CURRENCY_CODE);
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<Date>(defaultDueDate);
  const [items, setItems] = useState<InvoiceLineItemValues[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const { touched, touch } = useTouchedFields<CreateInvoiceField>();

  const selectedCustomer =
    customers?.find((customer) => customer.id === customerId) ?? null;

  const dueAtValue = formatDateInputValue(dueAt);

  const formValues = useMemo<CreateInvoiceFormValues>(
    () => ({
      customerId,
      currencyCode,
      description,
      dueAt: dueAtValue,
      items,
    }),
    [customerId, currencyCode, description, dueAtValue, items],
  );

  const {
    firstRequiredError,
    inlineErrorsByField,
    hasInlineErrors,
    isValid,
  } = useSplitFormValidation(
    formValues,
    createInvoiceRequiredValidators,
    createInvoiceInlineValidators,
  );

  const customerEmailError = customerEmailRequiredError(selectedCustomer?.email);

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
    ],
  );

  const totalQuantity = calculateTotalQuantity(
    items.map((item) => ({
      description: item.description,
      quantity: item.quantity || "1",
      unitAmount: item.unitAmount,
    })),
  );

  const descriptionError = getVisibleInlineError(
    inlineErrorsByField.description,
    Boolean(touched.description),
  );
  const customerError = getVisibleInlineError(
    touched.customerId
      ? inlineErrorsByField.customerId ||
          (customerId && customerEmailError ? customerEmailError : undefined)
      : undefined,
    Boolean(touched.customerId),
  );
  const itemsError = getVisibleInlineError(
    inlineErrorsByField.items,
    Boolean(touched.items),
  );
  const dueAtError = getVisibleInlineError(
    inlineErrorsByField.dueAt,
    Boolean(touched.dueAt),
  );

  const reviewDisabled =
    Boolean(firstRequiredError) ||
    hasInlineErrors ||
    Boolean(customerEmailError) ||
    items.length === 0;

  const reviewTooltip =
    firstRequiredError ??
    (customerEmailError && customerId ? customerEmailError : null) ??
    dueAtError ??
    (items.length === 0 ? "Add at least one item" : null);

  function openReview() {
    touch("customerId");
    touch("items");
    touch("description");
    touch("dueAt");

    if (reviewDisabled) {
      return;
    }

    setSubmitError(null);
    setReviewOpen(true);
  }

  async function handleSend() {
    if (!isValid || customerEmailError) {
      return;
    }

    setSubmitError(null);
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
      },
    );

    const data = (await response.json()) as {
      error?: string;
      id?: string;
      email_delivered?: boolean;
      email_logged?: boolean;
    };

    setIsSending(false);

    if (!response.ok) {
      setSubmitError(data.error ?? "Unable to send invoice");
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
    <InvoiceCreateShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4">
          <div>
            <h1 className="text-content-default text-lg font-semibold">
              Create {environment === "production" ? "" : "test "}invoice
            </h1>
            <p className="text-content-subtle text-sm">
              Build line items, preview, then send to your customer.
            </p>
          </div>
          <ValidatedSubmitButton
            text="Review invoice"
            className="h-9"
            type="button"
            onClick={openReview}
            requiredError={reviewTooltip}
            submitDisabled={reviewDisabled}
          />
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-2">
          <div className="relative min-h-0 overflow-y-auto px-6 py-6">
            {isEditingItem ? (
              <div className="absolute inset-0 z-10 bg-white" />
            ) : null}

            {submitError ? (
              <p className="relative z-0 mb-4 text-xs font-medium text-red-600">
                {submitError}
              </p>
            ) : null}

            <div className="relative mx-auto flex w-full max-w-lg flex-col gap-8">
              {!isEditingItem ? (
                <div className="flex flex-col gap-8">
                  <CustomerCombobox
                    customers={customers ?? []}
                    value={customerId}
                    onChange={setCustomerId}
                    error={customerError}
                    onTouch={() => touch("customerId")}
                    onCreate={async () => {
                      setCreateCustomerOpen(true);
                      return true;
                    }}
                  />

                  <InvoiceCurrencyPicker
                    value={currencyCode}
                    onChange={setCurrencyCode}
                    onTouch={() => touch("currencyCode")}
                  />
                </div>
              ) : null}

              <div className={cn("relative", isEditingItem && "z-20")}>
                <InvoiceLineItemsEditor
                  items={items}
                  currencyCode={currencyCode}
                  onChange={setItems}
                  error={itemsError}
                  onTouch={() => touch("items")}
                  onEditingChange={setIsEditingItem}
                />
              </div>

              {!isEditingItem ? (
              <div className="flex flex-col gap-8">
                <div className="space-y-1 border-t border-neutral-100 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-content-subtle">Total</span>
                    <span className="text-content-default font-medium">
                      {formatInvoiceAmount(presentation.amount, currencyCode)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-content-subtle">Quantity</span>
                    <span className="text-content-default">{totalQuantity}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <FormFieldLabel htmlFor="invoice-memo">Memo</FormFieldLabel>
                  <FormTextarea
                    id="invoice-memo"
                    rows={3}
                    placeholder="Optional note on the invoice"
                    value={description}
                    error={descriptionError}
                    onChange={(event) => {
                      touch("description");
                      setDescription(event.target.value);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <FormFieldLabel htmlFor="invoice-due-date">Due date</FormFieldLabel>
                  <InvoiceDueDatePicker
                    id="invoice-due-date"
                    value={dueAt}
                    error={dueAtError}
                    onChange={(date) => {
                      touch("dueAt");
                      setDueAt(date);
                    }}
                  />
                </div>
              </div>
              ) : null}
            </div>
          </div>

          <div className="bg-bg-preview flex min-h-[420px] flex-col border-t border-neutral-200 px-6 py-6 lg:border-t-0 lg:border-l">
            <div className="flex h-full min-h-0 w-full flex-col">
              <InvoicePreviewPanel
                organizationId={organizationId}
                presentation={presentation}
                environment={environment}
              />
            </div>
          </div>
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

      <CreateCustomerSheet
        organizationId={organizationId}
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        onCreated={(newCustomerId) => {
          void reloadCustomers();
          setCustomerId(newCustomerId);
        }}
      />
    </InvoiceCreateShell>
  );
}
