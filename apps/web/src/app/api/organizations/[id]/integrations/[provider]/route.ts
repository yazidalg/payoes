import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";
import {
  disconnectIntegration,
  getOrganizationIntegration,
} from "@/lib/integrations/service";
import { getIntegrationCatalogItem } from "@/lib/integrations/catalog";
import { deleteShopifyWebhook } from "@/lib/integrations/shopify/orders";
import {
  deleteWooCommerceWebhook,
  getWooCommerceCredentials,
} from "@/lib/integrations/woocommerce/orders";

const providerSchema = z.enum(["shopify", "woocommerce"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; provider: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, provider: providerParam } = await params;
  const provider = providerSchema.parse(providerParam);
  const organization = await getOrganizationForMember(id, session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const catalogItem = getIntegrationCatalogItem(provider);
  const integration = await getOrganizationIntegration(
    organization.id,
    organization.environment,
    provider,
  );

  return NextResponse.json({ catalogItem, integration });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; provider: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, provider: providerParam } = await params;
  const provider = providerSchema.parse(providerParam);
  const organization = await getOrganizationForMember(id, session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const integration = await getOrganizationIntegration(
    organization.id,
    organization.environment,
    provider,
  );

  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  try {
    if (
      provider === "shopify" &&
      integration.externalWebhookId &&
      integration.status === "connected"
    ) {
      await deleteShopifyWebhook(integration, integration.externalWebhookId);
    }

    if (provider === "woocommerce" && integration.externalWebhookId) {
      const credentials = getWooCommerceCredentials(integration);
      if (credentials) {
        await deleteWooCommerceWebhook({
          storeUrl: integration.storeIdentifier,
          credentials,
          webhookId: integration.externalWebhookId,
        });
      }
    }
  } catch {
    // Best effort remote cleanup.
  }

  const updated = await disconnectIntegration(integration);
  return NextResponse.json({ integration: updated });
}
