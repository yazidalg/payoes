import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  integrationOrderLinks,
  type Organization,
  type OrganizationIntegration,
} from "@/lib/db/schema";
import { createPayment, getCheckoutUrl } from "@/lib/payments/service";
import type { IntegrationOrderInput } from "./types";

export async function getIntegrationOrderLink(
  integrationId: string,
  externalOrderId: string,
) {
  const [link] = await db
    .select()
    .from(integrationOrderLinks)
    .where(
      and(
        eq(integrationOrderLinks.integrationId, integrationId),
        eq(integrationOrderLinks.externalOrderId, externalOrderId),
      ),
    )
    .limit(1);

  return link ?? null;
}

export async function createPaymentFromOrder(
  integration: OrganizationIntegration,
  organizationEnvironment: Organization["environment"],
  order: IntegrationOrderInput,
) {
  const existing = await getIntegrationOrderLink(
    integration.id,
    order.externalOrderId,
  );

  if (existing) {
    return {
      paymentId: existing.paymentId,
      checkoutUrl: existing.checkoutUrl,
      created: false,
    };
  }

  const payment = await createPayment({
    organizationId: integration.organizationId,
    environment: organizationEnvironment,
    amount: order.amount,
    description:
      order.description ??
      `${integration.provider} order ${order.externalOrderId}`,
    pricingCurrency: order.currency.toUpperCase(),
    pricingAmount: order.amount,
    metadata: {
      integration_provider: integration.provider,
      external_order_id: order.externalOrderId,
      store_identifier: integration.storeIdentifier,
      ...(order.customerEmail ? { customer_email: order.customerEmail } : {}),
    },
  });

  const checkoutUrl = getCheckoutUrl(payment.publicId);

  await db.insert(integrationOrderLinks).values({
    integrationId: integration.id,
    externalOrderId: order.externalOrderId,
    paymentId: payment.id,
    checkoutUrl,
  });

  return {
    paymentId: payment.id,
    checkoutUrl,
    created: true,
  };
}
