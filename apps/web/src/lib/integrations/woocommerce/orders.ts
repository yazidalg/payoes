import { createHmac, timingSafeEqual } from "node:crypto";
import { DEFAULT_AUTH_URL } from "@/constants/app";
import type { OrganizationIntegration } from "@/lib/db/schema";
import type { WooCommerceCredentials } from "../types";
import { normalizeWooCommerceStoreUrl } from "../service";

export function getWooCommerceWebhookUrl() {
  const baseUrl = process.env.AUTH_URL ?? DEFAULT_AUTH_URL;
  return `${baseUrl}/api/webhooks/woocommerce`;
}

export function getWooCommerceCredentials(integration: OrganizationIntegration) {
  return integration.credentials as WooCommerceCredentials | null;
}

export function verifyWooCommerceWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}) {
  if (!input.signatureHeader || !input.secret) {
    return false;
  }

  const digest = createHmac("sha256", input.secret)
    .update(input.rawBody, "utf8")
    .digest("base64");

  const provided = Buffer.from(input.signatureHeader);
  const expected = Buffer.from(digest);

  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

export async function wooCommerceFetch(
  storeUrl: string,
  credentials: WooCommerceCredentials,
  path: string,
  init?: RequestInit,
) {
  const origin = normalizeWooCommerceStoreUrl(storeUrl);
  const url = new URL(`${origin}/wp-json/wc/v3${path}`);
  url.searchParams.set("consumer_key", credentials.consumerKey);
  url.searchParams.set("consumer_secret", credentials.consumerSecret);

  return fetch(url, init);
}

export async function validateWooCommerceCredentials(input: {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}) {
  const response = await wooCommerceFetch(
    input.storeUrl,
    {
      consumerKey: input.consumerKey,
      consumerSecret: input.consumerSecret,
    },
    "/system_status",
  );

  if (!response.ok) {
    throw new Error("Unable to connect to WooCommerce with the provided keys");
  }
}

export async function registerWooCommerceOrderWebhook(input: {
  storeUrl: string;
  credentials: WooCommerceCredentials;
  secret: string;
}) {
  const response = await wooCommerceFetch(
    input.storeUrl,
    input.credentials,
    "/webhooks",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Payoes order created",
        topic: "order.created",
        delivery_url: getWooCommerceWebhookUrl(),
        secret: input.secret,
        status: "active",
      }),
    },
  );

  const payload = (await response.json()) as { id?: number; message?: string };

  if (!response.ok || !payload.id) {
    throw new Error(payload.message ?? "Unable to register WooCommerce webhook");
  }

  return String(payload.id);
}

export async function deleteWooCommerceWebhook(input: {
  storeUrl: string;
  credentials: WooCommerceCredentials;
  webhookId: string;
}) {
  await wooCommerceFetch(
    input.storeUrl,
    input.credentials,
    `/webhooks/${input.webhookId}?force=true`,
    {
      method: "DELETE",
    },
  );
}

export async function appendWooCommerceOrderMeta(input: {
  integration: OrganizationIntegration;
  orderId: string;
  checkoutUrl: string;
}) {
  const credentials = getWooCommerceCredentials(input.integration);
  if (!credentials) {
    return;
  }

  await wooCommerceFetch(
    input.integration.storeIdentifier,
    credentials,
    `/orders/${input.orderId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_note: `Pay with Payoes: ${input.checkoutUrl}`,
      }),
    },
  );
}

export type WooCommerceOrderPayload = {
  id: number | string;
  number?: string;
  status?: string;
  total?: string;
  currency?: string;
  billing?: {
    email?: string;
  };
};

export function parseWooCommerceOrderPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const order = payload as WooCommerceOrderPayload;
  if (!order.id) {
    return null;
  }

  if (order.status && order.status !== "pending") {
    return null;
  }

  return order;
}
