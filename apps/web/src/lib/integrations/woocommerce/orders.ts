import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl } from "@/constants/app";
import type { OrganizationIntegration } from "@/lib/db/schema";
import type { WooCommerceCredentials } from "../types";
import { normalizeWooCommerceStoreUrl } from "../service";

export function getWooCommerceWebhookUrl() {
  const baseUrl = getAppUrl();
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

type WooCommerceAmountLine = {
  total?: string | number;
  subtotal?: string | number;
};

export type WooCommerceOrderPayload = {
  id: number | string;
  number?: string | number;
  order_number?: string | number;
  status?: string;
  total?: string | number;
  current_total?: string | number;
  total_price?: string | number;
  subtotal?: string | number;
  total_tax?: string | number;
  shipping_total?: string | number;
  total_shipping?: string | number;
  discount_total?: string | number;
  total_discount?: string | number;
  currency?: string;
  billing?: {
    email?: string;
  };
  billing_address?: {
    email?: string;
  };
  customer?: {
    email?: string;
  };
  line_items?: WooCommerceAmountLine[];
  shipping_lines?: WooCommerceAmountLine[];
  fee_lines?: WooCommerceAmountLine[];
};

function parseWooCommerceAmount(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(parsed) ? parsed : null;
}

function sumWooCommerceLineAmounts(items: WooCommerceAmountLine[] | undefined) {
  if (!items?.length) {
    return 0;
  }

  return items.reduce((sum, item) => {
    const amount =
      parseWooCommerceAmount(item.total) ??
      parseWooCommerceAmount(item.subtotal) ??
      0;

    return sum + amount;
  }, 0);
}

function formatWooCommerceAmount(
  amount: number,
  original?: string | number,
) {
  if (original !== undefined && original !== null && original !== "") {
    const originalAmount = parseWooCommerceAmount(original);
    if (originalAmount === amount) {
      return String(original);
    }
  }

  if (Number.isInteger(amount)) {
    return String(amount);
  }

  return amount.toFixed(2);
}

export function resolveWooCommerceOrderTotal(order: WooCommerceOrderPayload) {
  const primaryTotals: Array<string | number | undefined> = [
    order.total,
    order.current_total,
    order.total_price,
  ];

  for (const field of primaryTotals) {
    const amount = parseWooCommerceAmount(field);
    if (amount !== null && amount > 0) {
      return formatWooCommerceAmount(amount, field);
    }
  }

  const subtotal = parseWooCommerceAmount(order.subtotal);
  const tax = parseWooCommerceAmount(order.total_tax) ?? 0;
  const shipping =
    parseWooCommerceAmount(order.shipping_total) ??
    parseWooCommerceAmount(order.total_shipping) ??
    0;
  const discount =
    parseWooCommerceAmount(order.discount_total) ??
    parseWooCommerceAmount(order.total_discount) ??
    0;

  if (subtotal !== null && subtotal > 0) {
    const computed = subtotal + tax + shipping - discount;
    if (computed > 0) {
      return formatWooCommerceAmount(computed);
    }
  }

  const lineItemsTotal = sumWooCommerceLineAmounts(order.line_items);
  const shippingLinesTotal = sumWooCommerceLineAmounts(order.shipping_lines);
  const feeLinesTotal = sumWooCommerceLineAmounts(order.fee_lines);
  const summed = lineItemsTotal + shippingLinesTotal + feeLinesTotal;

  if (summed > 0) {
    const withTax = summed + tax;
    return formatWooCommerceAmount(withTax > summed ? withTax : summed);
  }

  return null;
}

export function parseWooCommerceOrderPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const order = (
    root.id ? root : (root.order as WooCommerceOrderPayload | undefined)
  ) as WooCommerceOrderPayload | undefined;

  if (!order || typeof order !== "object" || !order.id) {
    return null;
  }

  if (order.status && order.status !== "pending") {
    return null;
  }

  return order;
}
