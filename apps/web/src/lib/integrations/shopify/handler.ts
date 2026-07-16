import type { OrganizationIntegration } from "@/lib/db/schema";
import { createPaymentFromOrder } from "../order-payments";
import {
  appendShopifyOrderNote,
  parseShopifyOrderCreatePayload,
} from "./orders";

export async function handleShopifyOrderWebhook(
  integration: OrganizationIntegration,
  payload: unknown,
) {
  const order = parseShopifyOrderCreatePayload(payload);
  if (!order?.total_price || !order.currency) {
    return { handled: false };
  }

  const result = await createPaymentFromOrder(integration, integration.environment, {
    externalOrderId: String(order.id),
    amount: order.total_price,
    currency: order.currency,
    description: order.name ? `Shopify ${order.name}` : `Shopify order ${order.id}`,
    customerEmail: order.email ?? null,
  });

  if (result.created) {
    await appendShopifyOrderNote({
      integration,
      orderId: String(order.id),
      note: `Payoes checkout: ${result.checkoutUrl}`,
    });
  }

  return { handled: true, ...result };
}
