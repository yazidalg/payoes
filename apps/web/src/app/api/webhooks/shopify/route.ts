import { NextResponse } from "next/server";
import { getIntegrationByStore } from "@/lib/integrations/service";
import { handleShopifyOrderWebhook } from "@/lib/integrations/shopify/handler";
import { verifyShopifyWebhookSignature } from "@/lib/integrations/shopify/webhooks";
import { normalizeShopifyShop } from "@/lib/integrations/service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const signature = request.headers.get("x-shopify-hmac-sha256");

  if (
    !verifyShopifyWebhookSignature({
      rawBody,
      signatureHeader: signature,
    })
  ) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  if (topic !== "orders/create" || !shopDomain) {
    return NextResponse.json({ received: true });
  }

  const integration = await getIntegrationByStore(
    "shopify",
    normalizeShopifyShop(shopDomain),
  );

  if (!integration) {
    return NextResponse.json({ received: true });
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;
    await handleShopifyOrderWebhook(integration, payload);
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
