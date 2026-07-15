import type { OrganizationIntegration } from "@/lib/db/schema";
import { createPaymentFromOrder } from "../order-payments";
import {
  appendWooCommerceOrderMeta,
  parseWooCommerceOrderPayload,
  resolveWooCommerceOrderTotal,
} from "./orders";

export async function handleWooCommerceOrderWebhook(
  integration: OrganizationIntegration,
  payload: unknown,
) {
  const order = parseWooCommerceOrderPayload(payload);
  if (!order?.currency) {
    return { handled: false };
  }

  const amount = resolveWooCommerceOrderTotal(order);
  if (!amount) {
    return { handled: false };
  }

  const orderNumber = order.number ?? order.order_number;
  const customerEmail =
    order.billing?.email ??
    order.billing_address?.email ??
    order.customer?.email ??
    null;

  const result = await createPaymentFromOrder(integration, integration.environment, {
    externalOrderId: String(order.id),
    amount,
    currency: order.currency,
    description: orderNumber
      ? `WooCommerce #${orderNumber}`
      : `WooCommerce order ${order.id}`,
    customerEmail,
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
