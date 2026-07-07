"use client";

import { useState } from "react";
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
import { ACCEPTED_ASSET_OPTIONS } from "@/lib/organizations/wallet-constants";
import { cn } from "@/lib/utils";

type CreatePaymentLinkDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (linkId: string) => void;
};

export function CreatePaymentLinkDialog({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: CreatePaymentLinkDialogProps) {
  const [amount, setAmount] = useState("10");
  const [asset, setAsset] = useState<(typeof ACCEPTED_ASSET_OPTIONS)[number]>("USDC");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setAmount("10");
    setAsset("USDC");
    setDescription("");
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/payment-links`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          asset,
          description: description || null,
        }),
      }
    );

    const data = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to create payment link");
      setIsLoading(false);
      return;
    }

    toast.success("Payment link created");
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
          <DialogTitle>Create payment link</DialogTitle>
          <DialogDescription>
            Create a reusable link that starts checkout on each visit.
          </DialogDescription>
        </DialogHeader>

        {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="create-link-amount">Amount</Label>
            <Input
              id="create-link-amount"
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
            <Label htmlFor="create-link-description">Description</Label>
            <Input
              id="create-link-description"
              placeholder="Product purchase"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
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
            Create link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
