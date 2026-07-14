import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paymentLinks, type Payment } from "@/lib/db/schema";
import {
  hasCustomerCollection,
  normalizePaymentLinkCustomerCollection,
  type PaymentLinkCustomerCollection,
} from "@/lib/payment-links/types";

export async function getCheckoutCustomerCollection(
  payment: Pick<Payment, "paymentLinkId">,
): Promise<PaymentLinkCustomerCollection | null> {
  if (!payment.paymentLinkId) {
    return null;
  }

  const link = await db
    .select({ customerCollection: paymentLinks.customerCollection })
    .from(paymentLinks)
    .where(eq(paymentLinks.id, payment.paymentLinkId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!link) {
    return null;
  }

  const collection = normalizePaymentLinkCustomerCollection(
    link.customerCollection,
  );

  return hasCustomerCollection(collection) ? collection : null;
}
