import type { InvoiceLineItemValues } from "./create-invoice-validation";
import type { FieldValidator } from "./form-validation";

export type CreatePaymentLinkFormValues = {
  currencyCode: string;
  description: string;
  items: InvoiceLineItemValues[];
};

export const createPaymentLinkRequiredValidators: FieldValidator<CreatePaymentLinkFormValues>[] =
  [
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
          : "Add at least one product with a description and unit price";
      },
    },
  ];

export const createPaymentLinkInlineValidators: FieldValidator<CreatePaymentLinkFormValues>[] =
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
  ];
