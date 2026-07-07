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

type CreateCustomerDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (customerId: string) => void;
};

export function CreateCustomerDialog({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: CreateCustomerDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setName("");
    setEmail("");
    setWallet("");
    setNotes("");
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch(`/api/organizations/${organizationId}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || null,
        email: email || null,
        primary_stellar_address: wallet || null,
        notes: notes || null,
      }),
    });

    const data = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to create customer");
      setIsLoading(false);
      return;
    }

    toast.success("Customer created");
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
          <DialogTitle>Create customer</DialogTitle>
          <DialogDescription>
            Add a payer profile you can link to future payments.
          </DialogDescription>
        </DialogHeader>

        {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="create-customer-name">Name</Label>
            <Input
              id="create-customer-name"
              placeholder="Alice Johnson"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-customer-email">Email</Label>
            <Input
              id="create-customer-email"
              type="email"
              placeholder="alice@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-customer-wallet">Stellar wallet (optional)</Label>
            <Input
              id="create-customer-wallet"
              placeholder="G..."
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-customer-notes">Notes</Label>
            <Input
              id="create-customer-notes"
              placeholder="VIP client, agency contact, etc."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
            Create customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
