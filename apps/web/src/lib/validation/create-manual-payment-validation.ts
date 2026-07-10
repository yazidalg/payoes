import { parseFiatAmount } from "@/lib/invoices/amount";
import type { InvoiceCurrencyCode } from "@/lib/invoices/currencies";
import { parseStellarAmount } from "@/lib/stellar/amount";
import type { FieldValidator } from "./form-validation";

export type CreateManualPaymentFormValues = {
  amount: string;
  currencyCode: string;
  useCurrency: boolean;
  paymentMethodKey: string;
  customerId: string;
  notes: string;
};

export const createManualPaymentRequiredValidators: FieldValidator<CreateManualPaymentFormValues>[] =
  [
    {
      field: "amount",
      validate: (values) =>
        values.amount.trim() ? null : "Amount is required",
    },
    {
      field: "paymentMethodKey",
      validate: (values) =>
        values.paymentMethodKey ? null : "Payment method is required",
    },
  ];

export const createManualPaymentInlineValidators: FieldValidator<CreateManualPaymentFormValues>[] =
  [
    {
      field: "amount",
      validate: (values) => {
        const amount = values.amount.trim();

        if (!amount) {
          return null;
        }

        try {
          if (values.useCurrency) {
            const parsed = parseFiatAmount(
              amount,
              values.currencyCode as InvoiceCurrencyCode,
            );
            const numeric = Number(parsed);

            if (!Number.isFinite(numeric) || numeric <= 0) {
              return "Amount must be greater than zero";
            }
          } else {
            parseStellarAmount(amount);
          }

          return null;
        } catch (error) {
          return error instanceof Error ? error.message : "Invalid amount";
        }
      },
    },
    {
      field: "notes",
      validate: (values) => {
        if (values.notes.length > 500) {
          return "Notes must be 500 characters or less";
        }

        return null;
      },
    },
  ];
