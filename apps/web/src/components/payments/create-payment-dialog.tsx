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
import {
  AllowedAssetsPicker,
  keysToAssetPayload,
  useDefaultAssetSelection,
} from "@/components/payment-methods/allowed-assets-picker";
import { useAsyncData } from "@/hooks/use-async-data";
import type { CustomerOption } from "@/lib/payments/types";
import { customerLabel } from "@/lib/payments/types";

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
  const {
    settlementKey,
    setSettlementKey,
    allowedKeys,
    setAllowedKeys,
    issuers,
    setIssuers,
  } = useDefaultAssetSelection(organizationId);

  const [amount, setAmount] = useState("10");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setAmount("10");
    setDescription("");
    setCustomerId("");
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const assetPayload = keysToAssetPayload(settlementKey, allowedKeys, issuers);

    const response = await fetch(`/api/organizations/${organizationId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        ...assetPayload,
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
          <AllowedAssetsPicker
            organizationId={organizationId}
            mode="settlement"
            settlementKey={settlementKey}
            selectedKeys={settlementKey ? [settlementKey] : []}
            onChange={(keys, map) => {
              setSettlementKey(keys[0] ?? "");
              setIssuers(map);
              if (!allowedKeys.includes(keys[0] ?? "")) {
                setAllowedKeys([...allowedKeys, keys[0] ?? ""]);
              }
            }}
          />
          <AllowedAssetsPicker
            organizationId={organizationId}
            mode="allowed"
            settlementKey={settlementKey}
            selectedKeys={allowedKeys}
            onChange={(keys, map) => {
              setAllowedKeys(keys);
              setIssuers(map);
            }}
          />
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
