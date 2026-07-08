"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CustomerPicker } from "@/components/invoices/customer-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAsyncData } from "@/hooks/use-async-data";
import type { CustomerOption, InvoiceRow } from "@/lib/payments/types";

export function InvoiceChangeCustomerDialog({
  open,
  onOpenChange,
  organizationId,
  invoice,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  invoice: InvoiceRow;
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState(invoice.customer_id ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/customers`);
    const data = (await response.json()) as {
      customers?: CustomerOption[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load customers");
    }

    return data.customers ?? [];
  }, [organizationId]);

  const { data: customers = [], isLoading } = useAsyncData(fetchCustomers, [
    organizationId,
    open,
  ]);

  useEffect(() => {
    if (open) {
      setCustomerId(invoice.customer_id ?? "");
    }
  }, [invoice.customer_id, open]);

  async function handleSave() {
    if (!customerId) {
      toast.error("Select a customer");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/invoices/${invoice.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_id: customerId }),
        }
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to change customer");
      }

      toast.success("Customer updated");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to change customer");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change customer</DialogTitle>
          <DialogDescription>
            Reassign this unpaid invoice to a different customer.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading customers...</p>
        ) : (
          <CustomerPicker customers={customers ?? []} value={customerId} onChange={setCustomerId} />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving || isLoading} onClick={() => void handleSave()}>
            {isSaving ? "Saving..." : "Save customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
