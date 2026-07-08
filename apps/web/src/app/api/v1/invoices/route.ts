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

const createInvoiceSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a valid Stellar amount"),
  customer_id: z.string().min(1),
  description: z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
  due_in_days: z.number().int().min(1).max(365).optional(),
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

    try {
      const invoice = await createInvoice({
        organizationId: apiKey.organizationId,
        environment: apiKey.environment,
        customerId: parsed.data.customer_id,
        amount: parsed.data.amount,
        description: parsed.data.description,
        metadata: parsed.data.metadata,
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
