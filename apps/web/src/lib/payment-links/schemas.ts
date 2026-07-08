import { z } from "zod";
import { paymentAssetConfigFields } from "@/lib/payment-methods/schemas";
import { fiatAmountPattern, resolveInvoiceCurrencyCode } from "@/lib/invoices/currencies";

export const paymentLinkCustomerCollectionSchema = z.object({
  collect_customer_name: z.boolean().optional().default(false),
  collect_business_name: z.boolean().optional().default(false),
  collect_customer_address: z.boolean().optional().default(false),
  require_phone_number: z.boolean().optional().default(false),
});

export const paymentLinkCustomerInputSchema = z.object({
  customer_name: z.string().max(200).optional().nullable(),
  business_name: z.string().max(200).optional().nullable(),
  phone_number: z.string().max(50).optional().nullable(),
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  address_city: z.string().max(120).optional().nullable(),
  address_state: z.string().max(120).optional().nullable(),
  address_postal_code: z.string().max(40).optional().nullable(),
  address_country: z.string().max(120).optional().nullable(),
});

const paymentLinkItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Quantity must be a valid number"),
  unit_amount: z.string().min(1),
});

export const createPaymentLinkBodySchema = z
  .object({
    currency_code: z.string().optional(),
    items: z.array(paymentLinkItemSchema).min(1, "Add at least one product"),
    description: z.string().max(500).optional().nullable(),
    customer_collection: paymentLinkCustomerCollectionSchema.optional(),
    metadata: z.record(z.string(), z.string()).optional().nullable(),
    ...paymentAssetConfigFields,
  })
  .superRefine((data, ctx) => {
    const currencyCode = resolveInvoiceCurrencyCode(data.currency_code);
    const amountPattern = fiatAmountPattern(currencyCode);

    for (const [index, item] of data.items.entries()) {
      if (!amountPattern.test(item.unit_amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unit amount must be a valid ${currencyCode} amount`,
          path: ["items", index, "unit_amount"],
        });
      }
    }
  });
