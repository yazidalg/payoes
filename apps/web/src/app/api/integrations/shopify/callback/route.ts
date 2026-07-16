import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationIntegrations } from "@/lib/db/schema";
import { parseIntegrationOAuthState } from "@/lib/integrations/state";
import {
  getOrganizationIntegration,
  markIntegrationError,
  markShopifyIntegrationConnected,
  upsertPendingShopifyIntegration,
} from "@/lib/integrations/service";
import { exchangeShopifyAccessToken } from "@/lib/integrations/shopify/oauth";
import { registerShopifyOrderWebhook } from "@/lib/integrations/shopify/orders";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const shop = url.searchParams.get("shop");

  if (!code || !state || !shop) {
    redirect("/dashboard/integrations/shopify?error=missing_params");
  }

  const parsedState = parseIntegrationOAuthState(state);
  if (!parsedState || parsedState.provider !== "shopify") {
    redirect("/dashboard/integrations/shopify?error=invalid_state");
  }

  const integration =
    (await getOrganizationIntegration(
      parsedState.organizationId,
      parsedState.environment,
      "shopify",
    )) ??
    (await upsertPendingShopifyIntegration({
      organizationId: parsedState.organizationId,
      environment: parsedState.environment,
      shop,
    }));

  try {
    const accessToken = await exchangeShopifyAccessToken({ shop, code });
    const connected = await markShopifyIntegrationConnected({
      integrationId: integration.id,
      accessToken,
    });

    if (!connected) {
      throw new Error("Unable to save Shopify connection");
    }

    const webhookId = await registerShopifyOrderWebhook(connected);

    await db
      .update(organizationIntegrations)
      .set({
        externalWebhookId: webhookId,
        updatedAt: new Date(),
      })
      .where(eq(organizationIntegrations.id, connected.id));
  } catch (error) {
    await markIntegrationError(
      integration.id,
      error instanceof Error ? error.message : "Shopify connection failed",
    );
    redirect("/dashboard/integrations/shopify?error=connect_failed");
  }

  redirect("/dashboard/integrations/shopify?connected=1");
}
