"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InvoiceCurrencyPicker } from "@/components/invoices/invoice-currency-picker";
import { PaymentLinkPreviewPanel } from "@/components/payment-links/payment-link-preview-panel";
import {
  calculateInvoiceTotal,
  calculateTotalQuantity,
  formatInvoiceAmount,
  lineItemAmount,
} from "@/lib/invoices/amount";
import { DEFAULT_INVOICE_CURRENCY_CODE } from "@/lib/invoices/currencies";
import {
  DEFAULT_PAYMENT_LINK_CUSTOMER_COLLECTION,
  type PaymentLinkCustomerCollection,
  type PaymentLinkPresentation,
} from "@/lib/payment-links/types";
import type { InvoiceLineItemValues } from "@/lib/validation/create-invoice-validation";
import {
  createPaymentLinkInlineValidators,
  createPaymentLinkRequiredValidators,
  type CreatePaymentLinkFormValues,
} from "@/lib/validation/create-payment-link-validation";
import {
  getVisibleInlineError,
  useSplitFormValidation,
  useTouchedFields,
} from "@/lib/validation/form-validation";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { FormTextarea } from "@/ui/forms/form-textarea";
import { ValidatedSubmitButton } from "@/ui/forms/validated-submit-button";
import { InvoiceLineItemsEditor } from "@/ui/invoices/invoice-line-items-editor";
import { PaymentLinkCreateShell } from "@/ui/payment-links/payment-link-create-shell";
import { cn } from "@dub/utils";

type CreatePaymentLinkField = keyof CreatePaymentLinkFormValues;

function buildDraftPresentation(input: {
  organizationName: string;
  organizationLogoUrl: string | null;
  organizationLogoInitials: string;
  environment: "sandbox" | "production";
  currencyCode: string;
  description: string;
  items: InvoiceLineItemValues[];
  customerCollection: PaymentLinkCustomerCollection;
}): PaymentLinkPresentation {
  const draftItems = input.items.map((item) => {
    const hasValues =
      item.description.trim() &&
      Number(item.unitAmount) > 0 &&
      Number(item.quantity) > 0;

    return {
      description: item.description.trim() || "Untitled product",
      quantity: item.quantity || "1",
      unit_amount: item.unitAmount || "0",
      line_amount: hasValues
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
    currencyCode: input.currencyCode,
    amount,
    items: draftItems,
    description: input.description.trim() || null,
    customerCollection: input.customerCollection,
    environmentLabel:
      input.environment === "production" ? "Production" : "Sandbox test mode",
    organization: {
      name: input.organizationName,
      logoUrl: input.organizationLogoUrl,
      logoInitials: input.organizationLogoInitials,
    },
  };
}

function CollectionOption({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 rounded border-neutral-300"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0">
        <span className="text-content-default block font-medium">{title}</span>
        <span className="text-content-subtle mt-0.5 block text-xs">
          {description}
        </span>
      </span>
    </label>
  );
}

export function CreatePaymentLinkPage({
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
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_INVOICE_CURRENCY_CODE);
  const [items, setItems] = useState<InvoiceLineItemValues[]>([]);
  const [description, setDescription] = useState("");
  const [customerCollection, setCustomerCollection] =
    useState<PaymentLinkCustomerCollection>(DEFAULT_PAYMENT_LINK_CUSTOMER_COLLECTION);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const { touched, touch } = useTouchedFields<CreatePaymentLinkField>();

  const formValues = useMemo<CreatePaymentLinkFormValues>(
    () => ({
      currencyCode,
      description,
      items,
    }),
    [currencyCode, description, items],
  );

  const {
    firstRequiredError,
    inlineErrorsByField,
    hasInlineErrors,
    isValid,
  } = useSplitFormValidation(
    formValues,
    createPaymentLinkRequiredValidators,
    createPaymentLinkInlineValidators,
  );

  const presentation = useMemo(
    () =>
      buildDraftPresentation({
        organizationName,
        organizationLogoUrl,
        organizationLogoInitials,
        environment,
        currencyCode,
        description,
        items,
        customerCollection,
      }),
    [
      currencyCode,
      customerCollection,
      description,
      environment,
      items,
      organizationLogoInitials,
      organizationLogoUrl,
      organizationName,
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
  const itemsError = getVisibleInlineError(
    inlineErrorsByField.items,
    Boolean(touched.items),
  );

  const createDisabled = Boolean(firstRequiredError) || hasInlineErrors || items.length === 0;
  const createTooltip =
    firstRequiredError ?? (items.length === 0 ? "Add at least one product" : null);

  function updateCollection(
    key: keyof PaymentLinkCustomerCollection,
    value: boolean,
  ) {
    setCustomerCollection((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate() {
    touch("items");
    touch("description");

    if (!isValid) {
      return;
    }

    setSubmitError(null);
    setIsLoading(true);

    const validItems = items.filter(
      (item) => item.description.trim() && Number(item.unitAmount) > 0,
    );

    const response = await fetch(
      `/api/organizations/${organizationId}/payment-links`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency_code: currencyCode,
          items: validItems.map((item) => ({
            description: item.description.trim(),
            quantity: item.quantity || "1",
            unit_amount: item.unitAmount,
          })),
          description: description.trim() || null,
          customer_collection: customerCollection,
        }),
      },
    );

    const data = (await response.json()) as { error?: string; id?: string };

    setIsLoading(false);

    if (!response.ok) {
      setSubmitError(data.error ?? "Unable to create payment link");
      return;
    }

    toast.success("Payment link created");
    router.push(`/dashboard/payments/links/${data.id}`);
  }

  return (
    <PaymentLinkCreateShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4">
          <div>
            <h1 className="text-content-default text-lg font-semibold">
              Create {environment === "production" ? "" : "test "}payment link
            </h1>
            <p className="text-content-subtle text-sm">
              Add products, preview the hosted page, then share the link.
            </p>
          </div>
          <ValidatedSubmitButton
            text="Create payment link"
            className="h-9"
            type="button"
            loading={isLoading}
            onClick={() => void handleCreate()}
            requiredError={createTooltip}
            submitDisabled={createDisabled}
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
                    <FormFieldLabel htmlFor="payment-link-memo">Memo</FormFieldLabel>
                    <FormTextarea
                      id="payment-link-memo"
                      rows={3}
                      placeholder="Optional note on the payment page"
                      value={description}
                      error={descriptionError}
                      onChange={(event) => {
                        touch("description");
                        setDescription(event.target.value);
                      }}
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <FormFieldLabel htmlFor="payment-link-additional-info">
                        Additional info
                      </FormFieldLabel>
                      <p className="text-content-subtle mt-1 text-xs">
                        Choose which customer details to collect on the checkout
                        page.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <CollectionOption
                        title="Collect customer name"
                        description="Ask for the payer's full name on the payment page."
                        checked={customerCollection.collect_customer_name}
                        onChange={(checked) =>
                          updateCollection("collect_customer_name", checked)
                        }
                      />
                      <CollectionOption
                        title="Collect business name"
                        description="Ask for the payer's company or organization name."
                        checked={customerCollection.collect_business_name}
                        onChange={(checked) =>
                          updateCollection("collect_business_name", checked)
                        }
                      />
                      <CollectionOption
                        title="Collect customer address"
                        description="Ask for a billing address before continuing to payment."
                        checked={customerCollection.collect_customer_address}
                        onChange={(checked) =>
                          updateCollection("collect_customer_address", checked)
                        }
                      />
                      <CollectionOption
                        title="Require phone number"
                        description="Make a phone number mandatory before checkout."
                        checked={customerCollection.require_phone_number}
                        onChange={(checked) =>
                          updateCollection("require_phone_number", checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-bg-preview flex min-h-[420px] flex-col border-t border-neutral-200 px-6 py-6 lg:border-t-0 lg:border-l">
            <div className="flex h-full min-h-0 w-full flex-col">
              <PaymentLinkPreviewPanel
                presentation={presentation}
                environment={environment}
              />
            </div>
          </div>
        </div>
      </div>
    </PaymentLinkCreateShell>
  );
}
