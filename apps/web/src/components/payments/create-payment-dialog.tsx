"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CustomerPicker } from "@/components/invoices/customer-picker";
import { InvoiceCurrencyPicker } from "@/components/invoices/invoice-currency-picker";
import { InvoiceDueDatePicker } from "@/components/invoices/invoice-due-date-picker";
import {
  AllowedAssetsPicker,
  keysToAssetPayload,
} from "@/components/payment-methods/allowed-assets-picker";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData } from "@/hooks/use-async-data";
import { paymentMethodKey as getPaymentMethodKey, useEnabledPaymentMethods } from "@/hooks/use-payment-methods";
import { DEFAULT_INVOICE_CURRENCY_CODE } from "@/lib/invoices/currencies";
import type { CustomerOption } from "@/lib/payments/types";
import { AppModal } from "@/ui/modals/app-modal";

type CreatePaymentDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (paymentId: string) => void;
};

function defaultPaidDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
}

export function CreatePaymentDialog({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: CreatePaymentDialogProps) {
  const fetchCustomers = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/customers`);
    const data = (await response.json()) as { customers?: CustomerOption[] };
    return data.customers ?? [];
  }, [organizationId]);

  const { data: customers } = useAsyncData(fetchCustomers, [organizationId]);
  const { data: paymentMethods } = useEnabledPaymentMethods(organizationId);

  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_INVOICE_CURRENCY_CODE);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethodKey, setPaymentMethodKey] = useState("");
  const [issuers, setIssuers] = useState<Map<string, string | null>>(new Map());
  const [paidDate, setPaidDate] = useState(defaultPaidDate);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
          (method) => [getPaymentMethodKey(method), method.issuer_address] as const
        )
      )
    );
  }, [paymentMethods, paymentMethodKey]);

  function resetForm() {
    setAmount("");
    setCurrencyCode(DEFAULT_INVOICE_CURRENCY_CODE);
    setCustomerId("");
    setPaymentMethodKey("");
    setIssuers(new Map());
    setPaidDate(defaultPaidDate());
    setNotes("");
    setError(null);
  }

  async function handleCreate() {
    setError(null);

    if (!amount.trim()) {
      setError("Amount is required");
      return;
    }

    if (!paymentMethodKey) {
      setError("Select a payment method");
      return;
    }

    setIsLoading(true);

    const assetPayload = keysToAssetPayload(
      paymentMethodKey,
      [paymentMethodKey],
      issuers
    );

    const response = await fetch(`/api/organizations/${organizationId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        currency_code: currencyCode,
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

  return (
    <AppModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
      title="Create manual payment"
      description="Record an off-platform payment that is marked as paid immediately."
      className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            isLoading={isLoading}
          >
            Record payment
          </Button>
        </>
      }
    >
      {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="create-payment-amount">Amount</Label>
            <Input
              id="create-payment-amount"
              inputMode="decimal"
              placeholder="100.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <InvoiceCurrencyPicker
            id="create-payment-currency"
            label="Currency"
            value={currencyCode}
            onChange={setCurrencyCode}
          />
        </div>

        <AllowedAssetsPicker
          organizationId={organizationId}
          mode="pay"
          label="Payment method"
          settlementKey={paymentMethodKey}
          selectedKeys={paymentMethodKey ? [paymentMethodKey] : []}
          onChange={(keys, map) => {
            setPaymentMethodKey(keys[0] ?? "");
            setIssuers(map);
          }}
        />

        <div className="space-y-2">
          <Label>Customer (optional)</Label>
          <CustomerPicker
            customers={customers ?? []}
            value={customerId}
            onChange={setCustomerId}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-payment-date">Date</Label>
          <InvoiceDueDatePicker
            value={paidDate}
            onChange={setPaidDate}
            allowPast
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-payment-notes">Notes</Label>
          <Input
            id="create-payment-notes"
            placeholder="Internal note or payment reference"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>
    </AppModal>
  );
}
