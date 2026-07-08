import { z } from "zod";
import { paymentAssetConfigFields } from "@/lib/payment-methods/schemas";

export const createManualPaymentBodySchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  currency_code: z.string().min(3).max(3),
  customer_id: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  paid_at: z.string().datetime(),
  ...paymentAssetConfigFields,
});
