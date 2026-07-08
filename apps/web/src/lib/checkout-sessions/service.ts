import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkoutSessions,
  customers,
  payments,
  type CheckoutSession,
  type Organization,
  type Payment,
} from "@/lib/db/schema";
import { DEFAULT_AUTH_URL } from "@/constants/app";
import type { AllowedAsset } from "@/lib/assets/types";
import { createPayment, getPaymentById, getPaymentByPublicId } from "@/lib/payments/service";
import { serializePaymentAssets } from "@/lib/assets/serialize";

function createSessionPublicId() {
  return `cs_${randomBytes(12).toString("base64url")}`;
}

export function getCheckoutSessionUrl(publicId: string) {
  const baseUrl = process.env.AUTH_URL ?? DEFAULT_AUTH_URL;
  return `${baseUrl}/c/${publicId}`;
}

export async function listCheckoutSessions(
  organizationId: string,
  environment: Organization["environment"],
  limit = 50
) {
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
      settlementAsset: payments.settlementAsset,
      paymentStatus: payments.status,
    })
    .from(checkoutSessions)
    .innerJoin(payments, eq(checkoutSessions.paymentId, payments.id))
    .where(
      and(
        eq(checkoutSessions.organizationId, organizationId),
        eq(payments.environment, environment)
      )
    )
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
  organizationId: string,
  environment: Organization["environment"]
) {
  const session = await getCheckoutSessionByPublicId(publicId);

  if (!session || session.organizationId !== organizationId) {
    return null;
  }

  const payment = await getPaymentById(
    session.paymentId,
    organizationId,
    environment
  );

  if (!payment) {
    return null;
  }

  return session;
}

export async function getCheckoutSessionDetail(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const session = await getCheckoutSessionForOrganization(
    publicId,
    organizationId,
    environment
  );

  if (!session) {
    return null;
  }

  const payment = await getPaymentById(
    session.paymentId,
    organizationId,
    environment
  );

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
  settlementAsset?: AllowedAsset | null;
  allowedAssets?: AllowedAsset[] | null;
  description?: string | null;
  metadata?: Record<string, string> | null;
  expiresInMinutes?: number;
  customerId?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
  sourceType?: "checkout_session" | "payment_link" | "invoice";
  paymentLinkId?: string | null;
  invoiceId?: string | null;
  pricingCurrency?: string | null;
  pricingAmount?: string | null;
}) {
  const payment = await createPayment({
    organizationId: input.organizationId,
    environment: input.environment,
    amount: input.amount,
    pricingCurrency: input.pricingCurrency,
    pricingAmount: input.pricingAmount,
    settlementAsset: input.settlementAsset,
    allowedAssets: input.allowedAssets,
    description: input.description,
    metadata: input.metadata,
    expiresInMinutes: input.expiresInMinutes,
    customerId: input.customerId,
    sourceType: input.sourceType ?? "checkout_session",
    paymentLinkId: input.paymentLinkId ?? null,
    invoiceId: input.invoiceId ?? null,
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
    settlementAsset?: string;
    paymentStatus?: string;
    payment?: Payment;
  },
  options?: {
    customerPublicId?: string | null;
    paymentPublicId?: string;
    payment?: Payment;
  }
) {
  const payment = options?.payment ?? session.payment;
  const assetFields = payment
    ? serializePaymentAssets(payment)
    : {
        settlement_asset: session.settlementAsset
          ? { asset_code: session.settlementAsset, issuer_address: null }
          : null,
        allowed_assets: [] as Array<{ asset_code: string; issuer_address: string | null }>,
        paid_asset: null,
      };

  return {
    id: session.publicId,
    object: "checkout.session",
    status: session.status,
    payment_intent_id: options?.paymentPublicId ?? session.paymentPublicId ?? null,
    amount: session.amount ?? payment?.amount ?? null,
    ...assetFields,
    payment_status: session.paymentStatus ?? payment?.status ?? null,
    customer_id: options?.customerPublicId ?? null,
    success_url: session.successUrl,
    cancel_url: session.cancelUrl,
    checkout_url: getCheckoutSessionUrl(session.publicId),
    expires_at: session.expiresAt,
    created_at: session.createdAt,
  };
}
