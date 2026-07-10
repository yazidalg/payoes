import type { FieldValidator } from "./form-validation";

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export type InvoiceLineItemValues = {
  id: string;
  description: string;
  quantity: string;
  unitAmount: string;
};

export type CreateInvoiceFormValues = {
  customerId: string;
  currencyCode: string;
  description: string;
  dueAt: string;
  items: InvoiceLineItemValues[];
};

export const createInvoiceRequiredValidators: FieldValidator<CreateInvoiceFormValues>[] =
  [
    {
      field: "customerId",
      validate: (values) =>
        values.customerId.trim() ? null : "Customer is required",
    },
    {
      field: "items",
      validate: (values) => {
        const validItems = values.items.filter(
          (item) =>
            item.description.trim() &&
            Number(item.quantity) > 0 &&
            Number(item.unitAmount) > 0,
        );

        return validItems.length > 0
          ? null
          : "Add at least one item with a description and unit price";
      },
    },
  ];

export const createInvoiceInlineValidators: FieldValidator<CreateInvoiceFormValues>[] =
  [
    {
      field: "description",
      validate: (values) => {
        if (values.description.length > 500) {
          return "Memo must be 500 characters or less";
        }

        return null;
      },
    },
    {
      field: "dueAt",
      validate: (values) => {
        if (!values.dueAt.trim()) {
          return null;
        }

        const parsed = parseDateOnly(values.dueAt);

        if (!parsed) {
          return "Due date must be valid";
        }

        const today = startOfLocalDay(new Date());
        const selected = startOfLocalDay(parsed);

        if (selected < today) {
          return "Due date must be today or in the future";
        }

        return null;
      },
    },
  ];

export function customerEmailRequiredError(
  customerEmail: string | null | undefined,
): string | null {
  if (!customerEmail?.trim()) {
    return "Selected customer must have an email address";
  }

  return null;
}
