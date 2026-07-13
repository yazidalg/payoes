"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AllowedAssetsPicker,
  keysToAssetPayload,
} from "@/components/payment-methods/allowed-assets-picker";
import { InvoiceCurrencyPicker } from "@/components/invoices/invoice-currency-picker";
import { InvoiceDueDatePicker } from "@/components/invoices/invoice-due-date-picker";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  paymentMethodKey as getPaymentMethodKey,
  useEnabledPaymentMethods,
} from "@/hooks/use-payment-methods";
import { DEFAULT_INVOICE_CURRENCY_CODE } from "@/lib/invoices/currencies";
import type { CustomerOption } from "@/lib/payments/types";
import {
  createManualPaymentInlineValidators,
  createManualPaymentRequiredValidators,
  type CreateManualPaymentFormValues,
} from "@/lib/validation/create-manual-payment-validation";
import {
  getVisibleInlineError,
  useSplitFormValidation,
  useTouchedFields,
} from "@/lib/validation/form-validation";
import { CustomerCombobox } from "@/ui/invoices/customer-combobox";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { FormInput } from "@/ui/forms/form-input";
import { FormTextarea } from "@/ui/forms/form-textarea";
import { ValidatedSubmitButton } from "@/ui/forms/validated-submit-button";
import { Button, Checkbox, InfoTooltip, Sheet } from "@dub/ui";
import { Xmark } from "@dub/ui/icons";

type CreatePaymentDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (paymentId: string) => void;
};

type CreateManualPaymentField = keyof CreateManualPaymentFormValues;

function defaultPaidDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
}

function paymentMethodAssetCode(paymentMethodKey: string) {
  return paymentMethodKey.split(":")[0] ?? "";
}

export function CreatePaymentDialog({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: CreatePaymentDialogProps) {
  const fetchCustomers = useCallback(async () => {
    const response = await apiFetch(`/api/organizations/${organizationId}/customers`);
    const data = (await response.json()) as { customers?: CustomerOption[] };
    return data.customers ?? [];
  }, [organizationId]);

  const { data: customers } = useAsyncData(fetchCustomers, [organizationId]);
  const { data: paymentMethods } = useEnabledPaymentMethods(organizationId);

  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_INVOICE_CURRENCY_CODE);
  const [useCurrency, setUseCurrency] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethodKey, setPaymentMethodKey] = useState("");
  const [issuers, setIssuers] = useState<Map<string, string | null>>(new Map());
  const [paidDate, setPaidDate] = useState(defaultPaidDate);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { touched, touch, resetTouched } =
    useTouchedFields<CreateManualPaymentField>();

  useEffect(() => {
    if (!paymentMethods || paymentMethods.length === 0 || paymentMethodKey) {
      return;
    }

    const defaultMethod =
      paymentMethods.find((method) => method.is_default) ?? paymentMethods[0];

    if (!defaultMethod) {
      return;
    }

    const key = getPaymentMethodKey(defaultMethod);
    setPaymentMethodKey(key);
    setIssuers(
      new Map(
        paymentMethods.map(
          (method) => [getPaymentMethodKey(method), method.issuer_address] as const,
        ),
      ),
    );
  }, [paymentMethods, paymentMethodKey]);

  const selectedAssetCode = useMemo(
    () => paymentMethodAssetCode(paymentMethodKey),
    [paymentMethodKey],
  );

  const formValues = useMemo<CreateManualPaymentFormValues>(
    () => ({
      amount,
      currencyCode,
      useCurrency,
      paymentMethodKey,
      customerId,
      notes,
    }),
    [amount, currencyCode, useCurrency, paymentMethodKey, customerId, notes],
  );

  const {
    firstRequiredError,
    inlineErrorsByField,
    hasInlineErrors,
    isValid,
  } = useSplitFormValidation(
    formValues,
    createManualPaymentRequiredValidators,
    createManualPaymentInlineValidators,
  );

  function resetForm() {
    setAmount("");
    setCurrencyCode(DEFAULT_INVOICE_CURRENCY_CODE);
    setUseCurrency(false);
    setCustomerId("");
    setPaymentMethodKey("");
    setIssuers(new Map());
    setPaidDate(defaultPaidDate());
    setNotes("");
    setError(null);
    resetTouched();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleFieldChange(
    field: CreateManualPaymentField,
    value: string,
    setter: (value: string) => void,
  ) {
    touch(field);
    setter(value);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();

    touch("amount");
    touch("paymentMethodKey");
    touch("notes");

    if (useCurrency) {
      touch("currencyCode");
    }

    if (!isValid) {
      return;
    }

    setError(null);
    setIsLoading(true);

    const assetPayload = keysToAssetPayload(
      paymentMethodKey,
      [paymentMethodKey],
      issuers,
    );

    const response = await apiFetch(`/api/organizations/${organizationId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        currency_code: useCurrency ? currencyCode : null,
        customer_id: customerId || null,
        notes: notes.trim() || null,
        paid_at: paidDate.toISOString(),
        ...assetPayload,
      }),
    });

    const data = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to create payment");
      setIsLoading(false);
      return;
    }

    toast.success("Payment recorded");
    resetForm();
    onOpenChange(false);
    onCreated?.(data.id ?? "");
    setIsLoading(false);
  }

  const amountError = getVisibleInlineError(
    inlineErrorsByField.amount,
    Boolean(touched.amount),
  );
  const paymentMethodError = getVisibleInlineError(
    inlineErrorsByField.paymentMethodKey,
    Boolean(touched.paymentMethodKey),
  );
  const notesError = getVisibleInlineError(
    inlineErrorsByField.notes,
    Boolean(touched.notes),
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <form onSubmit={(event) => void handleCreate(event)} className="flex h-full flex-col">
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50">
          <div className="flex h-16 items-center justify-between px-6 py-4">
            <div className="min-w-0">
              <Sheet.Title>Record manual payment</Sheet.Title>
              <Sheet.Description className="text-sm text-neutral-500">
                Record an off-platform payment that is marked as paid immediately.
              </Sheet.Description>
            </div>
            <Sheet.Close asChild>
              <Button
                type="button"
                variant="outline"
                icon={<Xmark className="size-5" />}
                className="h-auto w-fit shrink-0 p-1"
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 p-5 sm:p-6">
            {error ? (
              <p className="text-xs font-medium text-red-600">{error}</p>
            ) : null}

            <AllowedAssetsPicker
              organizationId={organizationId}
              mode="pay"
              label="Payment method"
              settlementKey={paymentMethodKey}
              selectedKeys={paymentMethodKey ? [paymentMethodKey] : []}
              onChange={(keys, map) => {
                touch("paymentMethodKey");
                setPaymentMethodKey(keys[0] ?? "");
                setIssuers(map);
                if (touched.amount) {
                  touch("amount");
                }
              }}
              error={paymentMethodError}
              onTouch={() => touch("paymentMethodKey")}
            />

            <div className="space-y-4">
              <div className="space-y-2">
                <FormFieldLabel htmlFor="create-payment-amount" required>
                  <span className="inline-flex items-center gap-1">
                    {useCurrency ? "Amount" : `Amount (${selectedAssetCode || "asset"})`}
                    <InfoTooltip
                      content={
                        useCurrency
                          ? "Enter the payment total in the selected fiat currency. The paid asset amount is calculated from the current exchange rate."
                          : "Enter the amount in the selected payment method asset. No currency conversion is applied."
                      }
                    />
                  </span>
                </FormFieldLabel>
                <FormInput
                  id="create-payment-amount"
                  inputMode="decimal"
                  placeholder={useCurrency ? "100.00" : "100.0000000"}
                  value={amount}
                  error={amountError}
                  onChange={(event) =>
                    handleFieldChange("amount", event.target.value, setAmount)
                  }
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox
                  id="create-payment-use-currency"
                  checked={useCurrency}
                  onCheckedChange={(checked) => {
                    const nextValue = checked === true;
                    setUseCurrency(nextValue);

                    if (nextValue) {
                      touch("currencyCode");
                    }

                    if (touched.amount) {
                      touch("amount");
                    }
                  }}
                  className="mt-0.5"
                />
                <span className="inline-flex items-center gap-1">
                  <span className="font-medium text-neutral-900">Price in fiat currency</span>
                  <InfoTooltip content="Enable this to set a fiat price. The payment amount is converted to the selected asset at the current rate. Leave unchecked to record the amount directly in the payment method asset." />
                </span>
              </label>

              {useCurrency ? (
                <div className="space-y-2">
                  <InvoiceCurrencyPicker
                    id="create-payment-currency"
                    label={
                      <span className="inline-flex items-center gap-1">
                        Currency
                        <InfoTooltip content="The invoice-style fiat currency used to price this payment. Customers pay in the selected asset at checkout rates." />
                      </span>
                    }
                    value={currencyCode}
                    onChange={(code) => {
                      touch("currencyCode");
                      setCurrencyCode(code);
                      if (touched.amount) {
                        touch("amount");
                      }
                    }}
                    onTouch={() => touch("currencyCode")}
                    hideHelperText
                  />
                </div>
              ) : null}
            </div>

            <CustomerCombobox
              id="create-payment-customer"
              label="Customer"
              required={false}
              placeholder="Select a customer (optional)"
              customers={customers ?? []}
              value={customerId}
              onChange={setCustomerId}
              onTouch={() => touch("customerId")}
            />

            <div className="space-y-2">
              <FormFieldLabel htmlFor="create-payment-date">
                <span className="inline-flex items-center gap-1">
                  Payment date
                  <InfoTooltip content="The date this payment was received off-platform. It is stored as the confirmed payment date." />
                </span>
              </FormFieldLabel>
              <InvoiceDueDatePicker
                id="create-payment-date"
                value={paidDate}
                onChange={setPaidDate}
                allowPast
              />
            </div>

            <div className="space-y-2">
              <FormFieldLabel htmlFor="create-payment-notes">
                <span className="inline-flex items-center gap-1">
                  Notes
                  <InfoTooltip content="Optional internal note or payment reference. Not shown to customers." />
                </span>
              </FormFieldLabel>
              <FormTextarea
                id="create-payment-notes"
                rows={4}
                placeholder="Internal note or payment reference"
                value={notes}
                error={notesError}
                onChange={(event) =>
                  handleFieldChange("notes", event.target.value, setNotes)
                }
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white p-5">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            />
            <ValidatedSubmitButton
              variant="primary"
              text="Record payment"
              loading={isLoading}
              requiredError={firstRequiredError}
              submitDisabled={hasInlineErrors}
              className="h-9"
            />
          </div>
        </div>
      </form>
    </Sheet>
  );
}
