import { getAppUrl } from "@/constants/app";
import { createIntegrationOAuthState } from "../state";
import { normalizeShopifyShop } from "../service";

function getShopifyClientId() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("SHOPIFY_CLIENT_ID is not configured");
  }
  return clientId;
}

function getShopifyClientSecret() {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("SHOPIFY_CLIENT_SECRET is not configured");
  }
  return clientSecret;
}

export function getShopifyScopes() {
  return process.env.SHOPIFY_SCOPES ?? "read_orders,write_orders";
}

export function getShopifyRedirectUri() {
  const baseUrl = getAppUrl();
  return `${baseUrl}/api/integrations/shopify/callback`;
}

export function buildShopifyOAuthUrl(input: {
  shop: string;
  organizationId: string;
  environment: "sandbox" | "production";
}) {
  const shop = normalizeShopifyShop(input.shop);
  const state = createIntegrationOAuthState({
    organizationId: input.organizationId,
    environment: input.environment,
    provider: "shopify",
    shop,
  });

  const params = new URLSearchParams({
    client_id: getShopifyClientId(),
    scope: getShopifyScopes(),
    redirect_uri: getShopifyRedirectUri(),
    state,
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeShopifyAccessToken(input: {
  shop: string;
  code: string;
}) {
  const shop = normalizeShopifyShop(input.shop);
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: getShopifyClientId(),
      client_secret: getShopifyClientSecret(),
      code: input.code,
    }),
  });

  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error ?? "Unable to exchange Shopify access token");
  }

  return payload.access_token;
}

export { getShopifyClientSecret };
