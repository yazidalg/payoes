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

type CreateCheckoutSessionDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (sessionId: string) => void;
};

export function CreateCheckoutSessionDialog({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: CreateCheckoutSessionDialogProps) {
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
  const [successUrl, setSuccessUrl] = useState("");
  const [cancelUrl, setCancelUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setAmount("10");
    setDescription("");
    setCustomerId("");
    setSuccessUrl("");
    setCancelUrl("");
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const assetPayload = keysToAssetPayload(settlementKey, allowedKeys, issuers);

    const response = await fetch(
      `/api/organizations/${organizationId}/checkout-sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          ...assetPayload,
          description: description || null,
          customer_id: customerId || null,
          success_url: successUrl || null,
          cancel_url: cancelUrl || null,
        }),
      }
    );

    const data = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to create checkout session");
      setIsLoading(false);
      return;
    }

    toast.success("Checkout session created");
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
          <DialogTitle>Create checkout session</DialogTitle>
          <DialogDescription>
            Start a hosted checkout flow with an underlying payment intent.
          </DialogDescription>
        </DialogHeader>

        {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="create-session-amount">Amount</Label>
            <Input
              id="create-session-amount"
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
            <Label htmlFor="create-session-description">Description</Label>
            <Input
              id="create-session-description"
              placeholder="Order #1024"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-session-customer">Customer (optional)</Label>
            <select
              id="create-session-customer"
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
          <div className="space-y-2">
            <Label htmlFor="create-session-success-url">Success URL (optional)</Label>
            <Input
              id="create-session-success-url"
              placeholder="https://example.com/success"
              value={successUrl}
              onChange={(event) => setSuccessUrl(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-session-cancel-url">Cancel URL (optional)</Label>
            <Input
              id="create-session-cancel-url"
              placeholder="https://example.com/cancel"
              value={cancelUrl}
              onChange={(event) => setCancelUrl(event.target.value)}
            />
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
            Create session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
