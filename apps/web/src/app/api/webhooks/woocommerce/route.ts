import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationIntegrations } from "@/lib/db/schema";
import { getIntegrationByStore, normalizeWooCommerceStoreUrl } from "@/lib/integrations/service";
import { handleWooCommerceOrderWebhook } from "@/lib/integrations/woocommerce/handler";
import { verifyWooCommerceWebhookSignature } from "@/lib/integrations/woocommerce/orders";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const topic = request.headers.get("x-wc-webhook-topic");
  const source = request.headers.get("x-wc-webhook-source");
  const signature = request.headers.get("x-wc-webhook-signature");

  if (!source) {
    return NextResponse.json({ received: true });
  }

  const storeIdentifier = normalizeWooCommerceStoreUrl(source);
  const integration = await getIntegrationByStore("woocommerce", storeIdentifier);

  if (!integration?.webhookSecret) {
    return NextResponse.json({ received: true });
  }

  if (
    !verifyWooCommerceWebhookSignature({
      rawBody,
      signatureHeader: signature,
      secret: integration.webhookSecret,
    })
  ) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  if (topic !== "order.created") {
    return NextResponse.json({ received: true });
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;
    await handleWooCommerceOrderWebhook(integration, payload);
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
