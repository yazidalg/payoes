import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import { parseAndResolveAssetConfig } from "@/lib/assets/validation";
import {
  createPaymentLink,
  listPaymentLinks,
  serializePaymentLink,
} from "@/lib/payment-links/service";
import { createPaymentLinkBodySchema } from "@/lib/payment-links/schemas";
import { resolveInvoiceCurrencyCode } from "@/lib/invoices/currencies";

export async function GET(request: Request) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const links = await listPaymentLinks(
      apiKey.organizationId,
      apiKey.environment
    );

    return NextResponse.json({
      payment_links: await Promise.all(
        links.map((link) => serializePaymentLink(link))
      ),
    });
  });
}

export async function POST(request: Request) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const body = await request.json();
    const parsed = createPaymentLinkBodySchema.safeParse(body);

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

      const currencyCode = resolveInvoiceCurrencyCode(parsed.data.currency_code);

      const link = await createPaymentLink({
        organizationId: apiKey.organizationId,
        environment: apiKey.environment,
        currencyCode,
        items: parsed.data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitAmount: item.unit_amount,
        })),
        settlementAsset: assetConfig.settlement_asset,
        allowedAssets: assetConfig.allowed_assets,
        description: parsed.data.description,
        customerCollection: parsed.data.customer_collection,
        metadata: parsed.data.metadata,
      });

      return NextResponse.json(
        await serializePaymentLink(link, { includeItems: true }),
        { status: 201 }
      );
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
