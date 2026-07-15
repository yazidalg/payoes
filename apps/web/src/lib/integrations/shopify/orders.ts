import { DEFAULT_AUTH_URL } from "@/constants/app";
import type { OrganizationIntegration } from "@/lib/db/schema";
import { getShopifyAccessToken } from "./webhooks";

export function getShopifyWebhookUrl() {
  const baseUrl = process.env.AUTH_URL ?? DEFAULT_AUTH_URL;
  return `${baseUrl}/api/webhooks/shopify`;
}

export function formatShopifyConnectError(rawMessage: string) {
  const lower = rawMessage.toLowerCase();
  const isScopeOrTopicError =
    lower.includes("invalid topic") ||
    lower.includes("missing access scope") ||
    lower.includes("protected customer data") ||
    lower.includes("topics allowed");

  if (isScopeOrTopicError) {
    return (
      `${rawMessage} ` +
      "Your Shopify Partner app needs Admin API scopes read_orders and write_orders, " +
      "plus Protected customer data access (Partners Dashboard → App → API access requests). " +
      "Save those settings, then disconnect and reconnect the store. " +
      "See Payoes docs: Shopify integration → Partner app setup."
    );
  }

  return rawMessage;
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
    errors?: string | Record<string, string[]>;
  };

  if (!response.ok || !payload.webhook?.id) {
    const errors = payload.errors;
    let message = "Unable to register Shopify webhook";

    if (typeof errors === "string") {
      message = errors;
    } else if (errors && typeof errors === "object") {
      const parts = Object.entries(errors).flatMap(([field, messages]) =>
        messages.map((entry) => `${field}: ${entry}`),
      );
      if (parts.length > 0) {
        message = parts.join("; ");
      }
    }

    throw new Error(formatShopifyConnectError(message));
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
