import type { OrganizationIntegration } from "@/lib/db/schema";
import { createPaymentFromOrder } from "../order-payments";
import {
  appendWooCommerceOrderMeta,
  parseWooCommerceOrderPayload,
} from "./orders";

export async function handleWooCommerceOrderWebhook(
  integration: OrganizationIntegration,
  payload: unknown,
) {
  const order = parseWooCommerceOrderPayload(payload);
  if (!order?.total || !order.currency) {
    return { handled: false };
  }

  const result = await createPaymentFromOrder(integration, integration.environment, {
    externalOrderId: String(order.id),
    amount: order.total,
    currency: order.currency,
    description: order.number
      ? `WooCommerce #${order.number}`
      : `WooCommerce order ${order.id}`,
    customerEmail: order.billing?.email ?? null,
  });

  if (result.created) {
    await appendWooCommerceOrderMeta({
      integration,
      orderId: String(order.id),
      checkoutUrl: result.checkoutUrl,
    });
  }

  return { handled: true, ...result };
}
