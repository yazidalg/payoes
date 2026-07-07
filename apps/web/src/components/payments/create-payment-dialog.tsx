"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData } from "@/hooks/use-async-data";
import { ACCEPTED_ASSET_OPTIONS } from "@/lib/organizations/wallet-constants";
import type { CustomerOption } from "@/lib/payments/types";
import { customerLabel } from "@/lib/payments/types";
import { cn } from "@/lib/utils";

type CreatePaymentDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (paymentId: string) => void;
};

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
  const [amount, setAmount] = useState("10");
  const [asset, setAsset] = useState<(typeof ACCEPTED_ASSET_OPTIONS)[number]>("USDC");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setAmount("10");
    setAsset("USDC");
    setDescription("");
    setCustomerId("");
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch(`/api/organizations/${organizationId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        asset,
        description: description || null,
        customer_id: customerId || null,
      }),
    });

    const data = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to create payment");
      setIsLoading(false);
      return;
    }

    toast.success("Payment created");
    resetForm();
    onOpenChange(false);
    onCreated?.(data.id ?? "");
    setIsLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create payment</DialogTitle>
          <DialogDescription>
            Create a hosted checkout payment you can share with a customer.
          </DialogDescription>
        </DialogHeader>

        {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="create-payment-amount">Amount</Label>
            <Input
              id="create-payment-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Asset</Label>
            <div className="flex gap-2">
              {ACCEPTED_ASSET_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAsset(option)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium",
                    asset === option
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-payment-description">Description</Label>
            <Input
              id="create-payment-description"
              placeholder="Invoice #1024"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-payment-customer">Customer (optional)</Label>
            <select
              id="create-payment-customer"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">No customer</option>
              {(customers ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customerLabel(customer)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
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
            Create payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
