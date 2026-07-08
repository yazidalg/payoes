import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import { parseAndResolveAssetConfig } from "@/lib/assets/validation";
import {
  createPaymentLink,
  listPaymentLinks,
  serializePaymentLink,
} from "@/lib/payment-links/service";
import { paymentAssetConfigFields } from "@/lib/payment-methods/schemas";

const createPaymentLinkSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a valid Stellar amount"),
  ...paymentAssetConfigFields,
  description: z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
});

export async function GET(request: Request) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const links = await listPaymentLinks(
      apiKey.organizationId,
      apiKey.environment
    );

    return NextResponse.json({
      payment_links: links.map((link) => serializePaymentLink(link)),
    });
  });
}

export async function POST(request: Request) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const body = await request.json();
    const parsed = createPaymentLinkSchema.safeParse(body);

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

      const link = await createPaymentLink({
        organizationId: apiKey.organizationId,
        environment: apiKey.environment,
        amount: parsed.data.amount,
        settlementAsset: assetConfig.settlement_asset,
        allowedAssets: assetConfig.allowed_assets,
        description: parsed.data.description,
        metadata: parsed.data.metadata,
      });

      return NextResponse.json(serializePaymentLink(link), { status: 201 });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Unable to create payment link",
        },
        { status: 400 }
      );
    }
  });
}
