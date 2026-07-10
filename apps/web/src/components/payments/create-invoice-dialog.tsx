"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData } from "@/hooks/use-async-data";
import type { CustomerOption } from "@/lib/payments/types";
import { customerLabel } from "@/lib/payments/types";
import { AppModal } from "@/ui/modals/app-modal";

type CreateInvoiceDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (invoiceId: string) => void;
};

export function CreateInvoiceDialog({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: CreateInvoiceDialogProps) {
  const fetchCustomers = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/customers`);
    const data = (await response.json()) as { customers?: CustomerOption[] };
    return data.customers ?? [];
  }, [organizationId]);

  const { data: customers } = useAsyncData(fetchCustomers, [organizationId]);
  const [amount, setAmount] = useState("10");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [dueInDays, setDueInDays] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setAmount("10");
    setDescription("");
    setCustomerId("");
    setDueInDays("30");
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch(`/api/organizations/${organizationId}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        description: description || null,
        customer_id: customerId,
        due_in_days: Number(dueInDays) || 30,
      }),
    });

    const data = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to create invoice");
      setIsLoading(false);
      return;
    }

    toast.success("Invoice created");
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
      title="Create invoice"
      description="Draft an invoice for a customer. Finalize it from the detail page."
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
            disabled={!customerId}
          >
            Create invoice
          </Button>
        </>
      }
    >
      {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="create-invoice-customer">Customer</Label>
          <select
            id="create-invoice-customer"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Select customer</option>
            {(customers ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customerLabel(customer)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-invoice-amount">Amount</Label>
          <Input
            id="create-invoice-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-invoice-description">Description</Label>
          <Input
            id="create-invoice-description"
            placeholder="Invoice #1024"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-invoice-due-days">Due in days</Label>
          <Input
            id="create-invoice-due-days"
            value={dueInDays}
            onChange={(event) => setDueInDays(event.target.value)}
          />
        </div>
      </div>
    </AppModal>
  );
}
