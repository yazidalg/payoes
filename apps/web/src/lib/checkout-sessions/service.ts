import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkoutSessions,
  customers,
  payments,
  type CheckoutSession,
  type Organization,
  type Payment,
} from "@/lib/db/schema";
import type { AcceptedAsset } from "@/lib/organizations/wallet-constants";
import { createPayment, getPaymentById, getPaymentByPublicId } from "@/lib/payments/service";

function createSessionPublicId() {
  return `cs_${randomBytes(12).toString("base64url")}`;
}

export function getCheckoutSessionUrl(publicId: string) {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/c/${publicId}`;
}

export async function listCheckoutSessions(organizationId: string, limit = 50) {
  return db
    .select({
      id: checkoutSessions.id,
      publicId: checkoutSessions.publicId,
      organizationId: checkoutSessions.organizationId,
      paymentId: checkoutSessions.paymentId,
      customerId: checkoutSessions.customerId,
      status: checkoutSessions.status,
      successUrl: checkoutSessions.successUrl,
      cancelUrl: checkoutSessions.cancelUrl,
      expiresAt: checkoutSessions.expiresAt,
      createdAt: checkoutSessions.createdAt,
      updatedAt: checkoutSessions.updatedAt,
      paymentPublicId: payments.publicId,
      amount: payments.amount,
      asset: payments.asset,
      paymentStatus: payments.status,
    })
    .from(checkoutSessions)
    .innerJoin(payments, eq(checkoutSessions.paymentId, payments.id))
    .where(eq(checkoutSessions.organizationId, organizationId))
    .orderBy(desc(checkoutSessions.createdAt))
    .limit(limit);
}

export async function getCheckoutSessionByPublicId(publicId: string) {
  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.publicId, publicId))
    .limit(1);

  return session ?? null;
}

export async function getCheckoutSessionForOrganization(
  publicId: string,
  organizationId: string
) {
  const session = await getCheckoutSessionByPublicId(publicId);

  if (!session || session.organizationId !== organizationId) {
    return null;
  }

  return session;
}

export async function getCheckoutSessionDetail(
  publicId: string,
  organizationId: string
) {
  const session = await getCheckoutSessionForOrganization(publicId, organizationId);

  if (!session) {
    return null;
  }

  const payment = await getPaymentById(session.paymentId, organizationId);

  if (!payment) {
    return null;
  }

  let customerPublicId: string | null = null;

  if (session.customerId) {
    const [customer] = await db
      .select({ publicId: customers.publicId })
      .from(customers)
      .where(eq(customers.id, session.customerId))
      .limit(1);

    customerPublicId = customer?.publicId ?? null;
  }

  return { session, payment, customerPublicId };
}

export async function createCheckoutSession(input: {
  organizationId: string;
  environment: Organization["environment"];
  amount: string;
  asset: AcceptedAsset;
  description?: string | null;
  metadata?: Record<string, string> | null;
  expiresInMinutes?: number;
  customerId?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
  sourceType?: "checkout_session" | "payment_link" | "invoice" | "subscription";
  paymentLinkId?: string | null;
  invoiceId?: string | null;
  subscriptionId?: string | null;
}) {
  const payment = await createPayment({
    organizationId: input.organizationId,
    environment: input.environment,
    amount: input.amount,
    asset: input.asset,
    description: input.description,
    metadata: input.metadata,
    expiresInMinutes: input.expiresInMinutes,
    customerId: input.customerId,
    sourceType: input.sourceType ?? "checkout_session",
    paymentLinkId: input.paymentLinkId ?? null,
    invoiceId: input.invoiceId ?? null,
    subscriptionId: input.subscriptionId ?? null,
  });

  const publicId = createSessionPublicId();

  const [session] = await db
    .insert(checkoutSessions)
    .values({
      publicId,
      organizationId: input.organizationId,
      paymentId: payment.id,
      customerId: payment.customerId,
      status: "open",
      successUrl: input.successUrl?.trim() || null,
      cancelUrl: input.cancelUrl?.trim() || null,
      expiresAt: payment.expiresAt,
    })
    .returning();

  return { session, payment };
}

export async function resolvePaymentForHostedCheckout(checkoutId: string): Promise<{
  payment: Payment;
  session: CheckoutSession | null;
} | null> {
  if (checkoutId.startsWith("cs_")) {
    const session = await getCheckoutSessionByPublicId(checkoutId);

    if (!session) {
      return null;
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, session.paymentId))
      .limit(1);

    if (!payment) {
      return null;
    }

    return { payment, session };
  }

  if (checkoutId.startsWith("pay_")) {
    const payment = await getPaymentByPublicId(checkoutId);

    if (!payment) {
      return null;
    }

    return { payment, session: null };
  }

  return null;
}

export async function syncCheckoutSessionWithPayment(payment: {
  id: string;
  status: string;
}) {
  const statusMap: Record<string, CheckoutSession["status"]> = {
    completed: "complete",
    expired: "expired",
    pending: "open",
    failed: "open",
  };

  const sessionStatus = statusMap[payment.status];

  if (!sessionStatus) {
    return;
  }

  await db
    .update(checkoutSessions)
    .set({
      status: sessionStatus,
      updatedAt: new Date(),
    })
    .where(eq(checkoutSessions.paymentId, payment.id));
}

export function serializeCheckoutSession(
  session: CheckoutSession & {
    paymentPublicId?: string;
    amount?: string;
    asset?: string;
    paymentStatus?: string;
  },
  options?: {
    customerPublicId?: string | null;
    paymentPublicId?: string;
  }
) {
  return {
    id: session.publicId,
    object: "checkout.session",
    status: session.status,
    payment_intent_id: options?.paymentPublicId ?? session.paymentPublicId ?? null,
    amount: session.amount ?? null,
    asset: session.asset ?? null,
    payment_status: session.paymentStatus ?? null,
    customer_id: options?.customerPublicId ?? null,
    success_url: session.successUrl,
    cancel_url: session.cancelUrl,
    checkout_url: getCheckoutSessionUrl(session.publicId),
    expires_at: session.expiresAt,
    created_at: session.createdAt,
  };
}
