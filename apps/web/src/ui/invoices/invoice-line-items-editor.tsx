"use client";

import { useEffect, useState } from "react";
import {
  formatInvoiceAmount,
  lineItemAmount,
} from "@/lib/invoices/amount";
import type { InvoiceLineItemValues } from "@/lib/validation/create-invoice-validation";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { FormInput } from "@/ui/forms/form-input";
import { Button } from "@dub/ui";
import { Plus } from "@dub/ui/icons";

type DraftItem = {
  description: string;
  quantity: string;
  unitAmount: string;
};

function createEmptyDraft(): DraftItem {
  return {
    description: "",
    quantity: "1",
    unitAmount: "",
  };
}

function draftLineTotal(draft: DraftItem, currencyCode: string) {
  if (!draft.description.trim() || !draft.unitAmount.trim()) {
    return null;
  }

  try {
    return lineItemAmount(
      {
        description: draft.description,
        quantity: draft.quantity || "1",
        unitAmount: draft.unitAmount,
      },
      currencyCode,
    );
  } catch {
    return null;
  }
}

export function InvoiceLineItemsEditor({
  items,
  currencyCode,
  onChange,
  error,
  onTouch,
  onEditingChange,
}: {
  items: InvoiceLineItemValues[];
  currencyCode: string;
  onChange: (items: InvoiceLineItemValues[]) => void;
  error?: string;
  onTouch?: () => void;
  onEditingChange?: (isEditing: boolean) => void;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<DraftItem>(createEmptyDraft());
  const [focusDescription, setFocusDescription] = useState(false);

  const isEditing = editingId !== null;
  const draftTotal = draftLineTotal(draft, currencyCode);

  useEffect(() => {
    onEditingChange?.(isEditing);
  }, [isEditing, onEditingChange]);

  useEffect(() => {
    if (editingId !== null) {
      setFocusDescription(true);
    }
  }, [editingId]);

  function openNewItem() {
    onTouch?.();
    setDraft(createEmptyDraft());
    setEditingId("new");
  }

  function openEditItem(item: InvoiceLineItemValues) {
    onTouch?.();
    setDraft({
      description: item.description,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
    });
    setEditingId(item.id);
  }

  function closeEditor() {
    setEditingId(null);
    setDraft(createEmptyDraft());
    setFocusDescription(false);
  }

  function saveItem(addAnother: boolean) {
    onTouch?.();

    const nextItem: InvoiceLineItemValues = {
      id: editingId === "new" ? crypto.randomUUID() : editingId!,
      description: draft.description.trim(),
      quantity: draft.quantity.trim() || "1",
      unitAmount: draft.unitAmount.trim(),
    };

    if (editingId === "new") {
      onChange([...items, nextItem]);
    } else {
      onChange(
        items.map((item) => (item.id === editingId ? nextItem : item)),
      );
    }

    if (addAnother) {
      setDraft(createEmptyDraft());
      setEditingId("new");
      setFocusDescription(true);
      return;
    }

    closeEditor();
  }

  function removeItem(id: string) {
    onTouch?.();
    onChange(items.filter((item) => item.id !== id));
    if (editingId === id) {
      closeEditor();
    }
  }

  if (isEditing) {
    return (
      <div className="relative z-20 space-y-5">
        <div className="space-y-2">
          <FormFieldLabel htmlFor="invoice-item-description" required>
            Description
          </FormFieldLabel>
          <FormInput
            id="invoice-item-description"
            autoFocus={focusDescription}
            placeholder="Product or service"
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormFieldLabel htmlFor="invoice-item-quantity">
              Quantity
            </FormFieldLabel>
            <FormInput
              id="invoice-item-quantity"
              inputMode="decimal"
              value={draft.quantity}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  quantity: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <FormFieldLabel htmlFor="invoice-item-unit-amount" required>
              Unit price ({currencyCode})
            </FormFieldLabel>
            <FormInput
              id="invoice-item-unit-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={draft.unitAmount}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  unitAmount: event.target.value,
                }))
              }
            />
          </div>
        </div>

        {draftTotal ? (
          <p className="text-content-subtle text-sm">
            Line total: {formatInvoiceAmount(draftTotal, currencyCode)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            text="Save"
            className="h-9"
            onClick={() => saveItem(false)}
            disabled={!draft.description.trim() || !draft.unitAmount.trim()}
          />
          <Button
            type="button"
            variant="secondary"
            text="Save and add another"
            className="h-9"
            onClick={() => saveItem(true)}
            disabled={!draft.description.trim() || !draft.unitAmount.trim()}
          />
          {editingId !== "new" ? (
            <Button
              type="button"
              variant="outline"
              text="Remove"
              className="h-9"
              onClick={() => removeItem(editingId)}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              text="Cancel"
              className="h-9"
              onClick={closeEditor}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <FormFieldLabel htmlFor="invoice-items">Items</FormFieldLabel>
        <button
          type="button"
          onClick={openNewItem}
          className="text-content-subtle hover:text-content-default inline-flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <Plus className="size-3.5" />
          Add item
        </button>
      </div>

      <div className="space-y-1">
        {items.length === 0 ? (
          <button
            type="button"
            onClick={openNewItem}
            className="text-content-subtle hover:border-border-default hover:text-content-default flex w-full items-center justify-center rounded-lg border border-dashed border-neutral-200 px-4 py-8 text-sm transition-colors"
          >
            Add your first item
          </button>
        ) : (
          items.map((item) => {
            const amount = (() => {
              try {
                return lineItemAmount(item, currencyCode);
              } catch {
                return "0";
              }
            })();

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openEditItem(item)}
                className="hover:bg-bg-muted flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors"
              >
                <span className="text-content-default min-w-0 truncate text-sm">
                  {item.description || "Untitled item"}
                  <span className="text-content-subtle">
                    {" "}
                    × {item.quantity || "1"}
                  </span>
                </span>
                <span className="text-content-default shrink-0 text-sm font-medium">
                  {formatInvoiceAmount(amount, currencyCode)}
                </span>
              </button>
            );
          })
        )}

        {items.length > 0 ? (
          <button
            type="button"
            onClick={openNewItem}
            className="text-content-subtle hover:text-content-default inline-flex items-center gap-1 px-2 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="size-3.5" />
            Add another item
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
