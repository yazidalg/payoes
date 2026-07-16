import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizationIntegrations,
  type Organization,
  type OrganizationIntegration,
} from "@/lib/db/schema";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import { INTEGRATION_CATALOG } from "./catalog";
import type {
  IntegrationListItem,
  IntegrationProviderId,
  ShopifyCredentials,
  WooCommerceCredentials,
} from "./types";

function createWebhookSecret() {
  return `intsec_${randomBytes(24).toString("base64url")}`;
}

export function normalizeShopifyShop(input: string) {
  const trimmed = input.trim().toLowerCase().replace(/^https?:\/\//, "");
  const withoutPath = trimmed.split("/")[0] ?? trimmed;

  if (withoutPath.endsWith(".myshopify.com")) {
    return withoutPath;
  }

  const slug = withoutPath.replace(/\.myshopify\.com$/, "");
  return `${slug}.myshopify.com`;
}

export function normalizeWooCommerceStoreUrl(input: string) {
  const trimmed = input.trim().replace(/\/$/, "");
  const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol).origin;
}

function mapCatalogToListItems(
  rows: OrganizationIntegration[],
): IntegrationListItem[] {
  return INTEGRATION_CATALOG.map<IntegrationListItem>((item) => ({
    ...item,
    integration: rows.find((row) => row.provider === item.id) ?? null,
  }));
}

export async function listOrganizationIntegrations(
  organizationId: string,
  environment: Organization["environment"],
) {
  try {
    const rows = await db
      .select()
      .from(organizationIntegrations)
      .where(
        organizationEnvironmentWhere(
          organizationIntegrations.organizationId,
          organizationIntegrations.environment,
          organizationId,
          environment,
        ),
      );

    return mapCatalogToListItems(rows);
  } catch {
    return mapCatalogToListItems([]);
  }
}

export async function getOrganizationIntegration(
  organizationId: string,
  environment: Organization["environment"],
  provider: IntegrationProviderId,
) {
  const [integration] = await db
    .select()
    .from(organizationIntegrations)
    .where(
      and(
        organizationEnvironmentWhere(
          organizationIntegrations.organizationId,
          organizationIntegrations.environment,
          organizationId,
          environment,
        ),
        eq(organizationIntegrations.provider, provider),
      ),
    )
    .limit(1);

  return integration ?? null;
}

export async function upsertPendingShopifyIntegration(input: {
  organizationId: string;
  environment: Organization["environment"];
  shop: string;
}) {
  const storeIdentifier = normalizeShopifyShop(input.shop);
  const existing = await getOrganizationIntegration(
    input.organizationId,
    input.environment,
    "shopify",
  );

  if (existing) {
    const [updated] = await db
      .update(organizationIntegrations)
      .set({
        storeIdentifier,
        status: "pending",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(organizationIntegrations.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(organizationIntegrations)
    .values({
      organizationId: input.organizationId,
      environment: input.environment,
      provider: "shopify",
      status: "pending",
      storeIdentifier,
      webhookSecret: createWebhookSecret(),
    })
    .returning();

  return created;
}

export async function markShopifyIntegrationConnected(input: {
  integrationId: string;
  accessToken: string;
  externalWebhookId?: string | null;
}) {
  const credentials: ShopifyCredentials = {
    accessToken: input.accessToken,
  };

  const [updated] = await db
    .update(organizationIntegrations)
    .set({
      status: "connected",
      credentials,
      externalWebhookId: input.externalWebhookId ?? null,
      connectedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(organizationIntegrations.id, input.integrationId))
    .returning();

  return updated ?? null;
}

export async function upsertWooCommerceIntegration(input: {
  organizationId: string;
  environment: Organization["environment"];
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  externalWebhookId?: string | null;
}) {
  const storeIdentifier = normalizeWooCommerceStoreUrl(input.storeUrl);
  const credentials: WooCommerceCredentials = {
    consumerKey: input.consumerKey,
    consumerSecret: input.consumerSecret,
  };

  const existing = await getOrganizationIntegration(
    input.organizationId,
    input.environment,
    "woocommerce",
  );

  if (existing) {
    const [updated] = await db
      .update(organizationIntegrations)
      .set({
        storeIdentifier,
        credentials,
        status: "connected",
        externalWebhookId: input.externalWebhookId ?? null,
        connectedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(organizationIntegrations.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(organizationIntegrations)
    .values({
      organizationId: input.organizationId,
      environment: input.environment,
      provider: "woocommerce",
      status: "connected",
      storeIdentifier,
      credentials,
      webhookSecret: createWebhookSecret(),
      externalWebhookId: input.externalWebhookId ?? null,
      connectedAt: new Date(),
    })
    .returning();

  return created;
}

export async function markIntegrationError(
  integrationId: string,
  message: string,
) {
  await db
    .update(organizationIntegrations)
    .set({
      status: "error",
      lastError: message,
      updatedAt: new Date(),
    })
    .where(eq(organizationIntegrations.id, integrationId));
}

export async function disconnectIntegration(
  integration: OrganizationIntegration,
) {
  const [updated] = await db
    .update(organizationIntegrations)
    .set({
      status: "disconnected",
      credentials: null,
      externalWebhookId: null,
      connectedAt: null,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(organizationIntegrations.id, integration.id))
    .returning();

  return updated ?? null;
}

export async function getIntegrationByStore(
  provider: IntegrationProviderId,
  storeIdentifier: string,
) {
  const [integration] = await db
    .select()
    .from(organizationIntegrations)
    .where(
      and(
        eq(organizationIntegrations.provider, provider),
        eq(organizationIntegrations.storeIdentifier, storeIdentifier),
        eq(organizationIntegrations.status, "connected"),
      ),
    )
    .limit(1);

  return integration ?? null;
}
