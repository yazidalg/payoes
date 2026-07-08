"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { InvoiceCurrencyPicker } from "@/components/invoices/invoice-currency-picker";
import { PaymentLinkPreviewPanel } from "@/components/payment-links/payment-link-preview-panel";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

type DraftProductItem = {
  id: string;
  description: string;
  quantity: string;
  unitAmount: string;
};

function createDraftItem(): DraftProductItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitAmount: "0",
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
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
        checked ? "border-primary bg-primary/5" : "hover:bg-muted/40"
      )}
    >
      <input
        type="checkbox"
        className="mt-1 size-4 rounded border-input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function buildDraftPresentation(input: {
  organizationName: string;
  organizationLogoUrl: string | null;
  organizationLogoInitials: string;
  environment: "sandbox" | "production";
  currencyCode: string;
  description: string;
  items: DraftProductItem[];
  customerCollection: PaymentLinkCustomerCollection;
}): PaymentLinkPresentation {
  const draftItems = input.items.map((item) => {
    const hasValues =
      item.description.trim() && Number(item.unitAmount) > 0 && Number(item.quantity) > 0;

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
  const [items, setItems] = useState<DraftProductItem[]>([createDraftItem()]);
  const [description, setDescription] = useState("");
  const [customerCollection, setCustomerCollection] =
    useState<PaymentLinkCustomerCollection>(DEFAULT_PAYMENT_LINK_CUSTOMER_COLLECTION);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    ]
  );

  const totalQuantity = useMemo(() => calculateTotalQuantity(items), [items]);

  function updateItem(id: string, patch: Partial<DraftProductItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function updateCollection(
    key: keyof PaymentLinkCustomerCollection,
    value: boolean
  ) {
    setCustomerCollection((current) => ({ ...current, [key]: value }));
  }

  function validateForm() {
    const validItems = items.filter(
      (item) => item.description.trim() && Number(item.unitAmount) > 0
    );

    if (validItems.length === 0) {
      return "Add at least one product with a price";
    }

    try {
      calculateInvoiceTotal(
        validItems.map((item) => ({
          description: item.description,
          quantity: item.quantity || "1",
          unitAmount: item.unitAmount,
        })),
        currencyCode
      );
    } catch (validationError) {
      return validationError instanceof Error
        ? validationError.message
        : "Invalid product amounts";
    }

    return null;
  }

  async function handleCreate() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsLoading(true);

    const validItems = items.filter(
      (item) => item.description.trim() && Number(item.unitAmount) > 0
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
      }
    );

    const data = (await response.json()) as { error?: string; id?: string };

    setIsLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to create payment link");
      return;
    }

    toast.success("Payment link created");
    router.push(`/dashboard/payments/links/${data.id}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/payments?tab=payment-links"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">
              Create {environment === "production" ? "" : "test "}payment link
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose a currency, add products, preview the hosted page, then share the link.
            </p>
          </div>
        </div>
        <Button type="button" onClick={() => void handleCreate()} isLoading={isLoading}>
          Create payment link
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="overflow-auto border-r px-4 py-6 sm:px-6">
          {error ? (
            <AlertBlock type="error" className="mb-4">
              {error}
            </AlertBlock>
          ) : null}

          <div className="space-y-6">
            <section className="space-y-2">
              <InvoiceCurrencyPicker
                value={currencyCode}
                onChange={setCurrencyCode}
              />
              <p className="text-xs text-muted-foreground">
                Customers can pay with any enabled Stellar token at checkout. The
                link total stays in this currency.
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Products</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((current) => [...current, createDraftItem()])}
                >
                  <PlusIcon className="size-4" />
                  Add product
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="grid gap-3">
                      <Input
                        placeholder="Product name"
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
              <Label htmlFor="payment-link-memo">Memo</Label>
              <Input
                id="payment-link-memo"
                placeholder="Optional note on the payment page"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </section>

            <section className="space-y-3">
              <div>
                <Label>Additional options</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Collect extra customer details before checkout.
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
            </section>
          </div>
        </div>

        <div className="min-h-[480px] p-4 sm:p-6">
          <PaymentLinkPreviewPanel presentation={presentation} environment={environment} />
        </div>
      </div>
    </div>
  );
}
