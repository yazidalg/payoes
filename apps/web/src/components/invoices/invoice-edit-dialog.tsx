"use client";

import { useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
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
import type { InvoiceLineItemRow, InvoiceRow } from "@/lib/payments/types";

type DraftItem = InvoiceLineItemRow & { key: string };

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function InvoiceEditDialog({
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
  const [description, setDescription] = useState(invoice.description ?? "");
  const [dueAt, setDueAt] = useState(toDateTimeLocalValue(invoice.due_at));
  const [items, setItems] = useState<DraftItem[]>(
    invoice.items.length > 0
      ? invoice.items.map((item) => ({ ...item, key: crypto.randomUUID() }))
      : [{ key: crypto.randomUUID(), description: "", quantity: "1", unit_amount: "0" }]
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDescription(invoice.description ?? "");
    setDueAt(toDateTimeLocalValue(invoice.due_at));
    setItems(
      invoice.items.length > 0
        ? invoice.items.map((item) => ({ ...item, key: crypto.randomUUID() }))
        : [{ key: crypto.randomUUID(), description: "", quantity: "1", unit_amount: "0" }]
    );
  }, [invoice, open]);

  async function handleSave() {
    const validItems = items.filter(
      (item) => item.description.trim() && Number(item.unit_amount) > 0
    );

    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/invoices/${invoice.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: description.trim() || null,
            due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
            items: validItems.map((item) => ({
              description: item.description.trim(),
              quantity: item.quantity || "1",
              unit_amount: item.unit_amount,
            })),
          }),
        }
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update invoice");
      }

      toast.success("Invoice updated");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update invoice");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit invoice</DialogTitle>
          <DialogDescription>
            Update line items, memo, and due date while the invoice is still unpaid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="invoice-description">Memo</Label>
            <Input
              id="invoice-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional invoice memo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-due-at">Due date</Label>
            <Input
              id="invoice-due-at"
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    {
                      key: crypto.randomUUID(),
                      description: "",
                      quantity: "1",
                      unit_amount: "0",
                    },
                  ])
                }
              >
                <PlusIcon />
                Add item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.key}
                  className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_100px_120px_auto]"
                >
                  <Input
                    value={item.description}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, description: event.target.value }
                            : row
                        )
                      )
                    }
                    placeholder="Description"
                  />
                  <Input
                    value={item.quantity}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, quantity: event.target.value }
                            : row
                        )
                      )
                    }
                    placeholder="Qty"
                  />
                  <Input
                    value={item.unit_amount}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, unit_amount: event.target.value }
                            : row
                        )
                      )
                    }
                    placeholder="Unit amount"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))
                    }
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
