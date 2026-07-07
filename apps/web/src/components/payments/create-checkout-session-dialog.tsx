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
  const [amount, setAmount] = useState("10");
  const [asset, setAsset] = useState<(typeof ACCEPTED_ASSET_OPTIONS)[number]>("USDC");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [successUrl, setSuccessUrl] = useState("");
  const [cancelUrl, setCancelUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setAmount("10");
    setAsset("USDC");
    setDescription("");
    setCustomerId("");
    setSuccessUrl("");
    setCancelUrl("");
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/checkout-sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          asset,
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
