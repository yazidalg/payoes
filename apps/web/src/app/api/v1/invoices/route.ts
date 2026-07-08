import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import {
  createInvoice,
  getInvoiceDetail,
  getInvoicePaymentAssets,
  listInvoices,
  serializeInvoices,
  serializeInvoice,
} from "@/lib/invoices/service";
import {
  fiatAmountPattern,
  resolveInvoiceCurrencyCode,
} from "@/lib/invoices/currencies";

const createInvoiceSchema = z
  .object({
    amount: z.string().min(1),
    customer_id: z.string().min(1),
    currency_code: z.string().optional(),
    description: z.string().max(500).optional().nullable(),
    metadata: z.record(z.string(), z.string()).optional().nullable(),
    due_at: z.string().datetime().optional(),
    due_in_days: z.number().int().min(1).max(365).optional(),
  })
  .superRefine((data, ctx) => {
    const currencyCode = resolveInvoiceCurrencyCode(data.currency_code);
    const amountPattern = fiatAmountPattern(currencyCode);

    if (!amountPattern.test(data.amount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Amount must be a valid ${currencyCode} amount`,
        path: ["amount"],
      });
    }
  });

export async function GET(request: Request) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const rows = await listInvoices(apiKey.organizationId, apiKey.environment);

    return NextResponse.json({
      invoices: await serializeInvoices(rows),
    });
  });
}

export async function POST(request: Request) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const currencyCode = resolveInvoiceCurrencyCode(parsed.data.currency_code);

    try {
      const invoice = await createInvoice({
        organizationId: apiKey.organizationId,
        environment: apiKey.environment,
        customerId: parsed.data.customer_id,
        amount: parsed.data.amount,
        currencyCode,
        description: parsed.data.description,
        metadata: parsed.data.metadata,
        dueAt: parsed.data.due_at ? new Date(parsed.data.due_at) : undefined,
        dueInDays: parsed.data.due_in_days,
      });

      const detail = await getInvoiceDetail(
        invoice.publicId,
        apiKey.organizationId,
        apiKey.environment
      );

      if (!detail) {
        return NextResponse.json(
          { error: "Unable to load created invoice" },
          { status: 500 }
        );
      }

      const paymentAssets = await getInvoicePaymentAssets(detail.invoice);

      return NextResponse.json(
        serializeInvoice(
          { ...detail.invoice, customerPublicId: detail.customerPublicId },
          {
            checkoutUrl: detail.checkoutUrl,
            checkoutSessionPublicId: detail.checkoutSessionPublicId,
            settlementAsset: paymentAssets.settlement_asset.asset_code,
            allowedAssets: paymentAssets.allowed_assets.map((a) => a.asset_code),
          }
        ),
        { status: 201 }
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Unable to create invoice",
        },
        { status: 400 }
      );
    }
  });
}
