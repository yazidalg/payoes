import { DEFAULT_AUTH_URL } from "@/constants/app";
import type { OrganizationIntegration } from "@/lib/db/schema";
import { getShopifyAccessToken } from "./webhooks";

export function getShopifyWebhookUrl() {
  const baseUrl = process.env.AUTH_URL ?? DEFAULT_AUTH_URL;
  return `${baseUrl}/api/webhooks/shopify`;
}

export async function shopifyAdminFetch(
  integration: OrganizationIntegration,
  path: string,
  init?: RequestInit,
) {
  const accessToken = getShopifyAccessToken(integration);
  if (!accessToken) {
    throw new Error("Shopify access token is missing");
  }

  const response = await fetch(
    `https://${integration.storeIdentifier}/admin/api/2024-10${path}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
        ...(init?.headers ?? {}),
      },
    },
  );

  return response;
}

export async function registerShopifyOrderWebhook(
  integration: OrganizationIntegration,
) {
  const response = await shopifyAdminFetch(integration, "/webhooks.json", {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        topic: "orders/create",
        address: getShopifyWebhookUrl(),
        format: "json",
      },
    }),
  });

  const payload = (await response.json()) as {
    webhook?: { id?: number };
    errors?: string;
  };

  if (!response.ok || !payload.webhook?.id) {
    throw new Error(
      typeof payload.errors === "string"
        ? payload.errors
        : "Unable to register Shopify webhook",
    );
  }

  return String(payload.webhook.id);
}

export async function deleteShopifyWebhook(
  integration: OrganizationIntegration,
  webhookId: string,
) {
  await shopifyAdminFetch(integration, `/webhooks/${webhookId}.json`, {
    method: "DELETE",
  });
}

export async function appendShopifyOrderNote(input: {
  integration: OrganizationIntegration;
  orderId: string;
  note: string;
}) {
  await shopifyAdminFetch(
    input.integration,
    `/orders/${input.orderId}.json`,
    {
      method: "PUT",
      body: JSON.stringify({
        order: {
          id: input.orderId,
          note: input.note,
        },
      }),
    },
  );
}

export type ShopifyOrderPayload = {
  id: number | string;
  name?: string;
  financial_status?: string;
  total_price?: string;
  currency?: string;
  email?: string | null;
};

export function parseShopifyOrderCreatePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const order = (payload as { id?: unknown }).id
    ? (payload as ShopifyOrderPayload)
    : ((payload as { order?: ShopifyOrderPayload }).order ?? null);

  if (!order?.id) {
    return null;
  }

  if (order.financial_status && order.financial_status !== "pending") {
    return null;
  }

  return order;
}
