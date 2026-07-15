import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import { parseAndResolveAssetConfig } from "@/lib/assets/validation";
import {
  fiatAmountPattern,
  isInvoiceCurrencyCode,
} from "@/lib/invoices/currencies";
import { paymentAssetConfigFields } from "@/lib/payment-methods/schemas";
import {
  createPayment,
  listPayments,
  serializePayments,
} from "@/lib/payments/service";

const createPaymentSchema = z
  .object({
    pricing_currency: z.string().min(1, "pricing_currency is required"),
    pricing_amount: z.string().min(1, "pricing_amount is required"),
    amount: z.string().optional(),
    ...paymentAssetConfigFields,
    description: z.string().max(500).optional().nullable(),
    metadata: z.record(z.string(), z.string()).optional().nullable(),
    expires_in_minutes: z.number().int().min(5).max(10080).optional(),
    customer_id: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const pricingCurrency = data.pricing_currency.trim().toUpperCase();

    if (!isInvoiceCurrencyCode(pricingCurrency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pricing_currency must be a supported ISO currency code",
        path: ["pricing_currency"],
      });
    }

    if (!fiatAmountPattern(pricingCurrency).test(data.pricing_amount.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `pricing_amount must be a valid ${pricingCurrency} amount`,
        path: ["pricing_amount"],
      });
    }
  });

export async function GET(request: Request) {
  return withApiKeyAuth(
    request,
    async ({ apiKey }) => {
      const paymentList = await listPayments(
        apiKey.organizationId,
        apiKey.environment
      );
      return NextResponse.json({
        payments: await serializePayments(paymentList),
      });
    },
    { resource: "payments", action: "read" }
  );
}

export async function POST(request: Request) {
  return withApiKeyAuth(
    request,
    async ({ apiKey }) => {
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    try {
      const assetConfig = await parseAndResolveAssetConfig(apiKey.organizationId, {
        settlement_asset: parsed.data.settlement_asset,
        allowed_assets: parsed.data.allowed_assets,
      });

      const pricingCurrency = parsed.data.pricing_currency.trim().toUpperCase();
      const pricingAmount = parsed.data.pricing_amount.trim();

      const payment = await createPayment({
        organizationId: apiKey.organizationId,
        environment: apiKey.environment,
        amount: pricingAmount,
        settlementAsset: assetConfig.settlement_asset,
        allowedAssets: assetConfig.allowed_assets,
        description: parsed.data.description,
        metadata: parsed.data.metadata,
        expiresInMinutes: parsed.data.expires_in_minutes,
        customerId: parsed.data.customer_id,
        pricingCurrency,
        pricingAmount,
      });

      const serialized = await serializePayments([payment]);

      return NextResponse.json(serialized[0], { status: 201 });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Unable to create payment",
        },
        { status: 400 }
      );
    }
  },
    { resource: "payments", action: "write" }
  );
}
