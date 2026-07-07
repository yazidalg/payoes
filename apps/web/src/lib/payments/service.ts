import { randomBytes } from "node:crypto";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments, type Organization, type Payment } from "@/lib/db/schema";
import type { AcceptedAsset } from "@/lib/organizations/wallet-constants";
import { getReceivingWallet } from "@/lib/organizations/wallet";
import { normalizeStellarAmount } from "@/lib/stellar/amount";
import { dispatchWebhookEvent } from "@/lib/webhooks/delivery";

function createPublicId() {
  return `pay_${randomBytes(12).toString("base64url")}`;
}

export function getCheckoutUrl(publicId: string) {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/c/${publicId}`;
}

export async function listPayments(organizationId: string, limit = 50) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.organizationId, organizationId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

export async function getPaymentByPublicId(publicId: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.publicId, publicId))
    .limit(1);

  return payment ?? null;
}

export async function getPaymentById(id: string, organizationId: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(eq(payments.id, id), eq(payments.organizationId, organizationId))
    )
    .limit(1);

  return payment ?? null;
}

export async function expireStalePayments(organizationId: string) {
  const now = new Date();
  const stale = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "pending"),
        lt(payments.expiresAt, now)
      )
    );

  for (const payment of stale) {
    await updatePaymentStatus(payment, "expired");
  }
}

export async function createPayment(input: {
  organizationId: string;
  environment: Organization["environment"];
  amount: string;
  asset: AcceptedAsset;
  description?: string | null;
  metadata?: Record<string, string> | null;
  expiresInMinutes?: number;
}) {
  const wallet = await getReceivingWallet(input.organizationId, input.environment);

  if (!wallet) {
    throw new Error("Receiving wallet is not configured");
  }

  if (!wallet.acceptedAssets.includes(input.asset)) {
    throw new Error(`Asset ${input.asset} is not accepted by this organization`);
  }

  const expiresAt = new Date(
    Date.now() + (input.expiresInMinutes ?? 60) * 60 * 1000
  );

  const publicId = createPublicId();

  const [payment] = await db
    .insert(payments)
    .values({
      publicId,
      organizationId: input.organizationId,
      environment: input.environment,
      amount: normalizeStellarAmount(input.amount),
      asset: input.asset,
      receivingAddress: wallet.stellarAddress,
      description: input.description?.trim() || null,
      metadata: input.metadata ?? null,
      memo: publicId.slice(0, 28),
      expiresAt,
      status: "pending",
    })
    .returning();

  await dispatchWebhookEvent({
    organizationId: input.organizationId,
    event: "payment.created",
    payload: serializePayment(payment),
  });

  return payment;
}

export async function updatePaymentStatus(
  payment: Payment,
  status: Payment["status"],
  extra?: { txHash?: string; confirmedAt?: Date }
) {
  const [updated] = await db
    .update(payments)
    .set({
      status,
      txHash: extra?.txHash ?? payment.txHash,
      confirmedAt: extra?.confirmedAt ?? payment.confirmedAt,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id))
    .returning();

  const eventMap = {
    completed: "payment.completed",
    failed: "payment.failed",
    expired: "payment.expired",
  } as const;

  if (status in eventMap) {
    await dispatchWebhookEvent({
      organizationId: payment.organizationId,
      event: eventMap[status as keyof typeof eventMap],
      payload: serializePayment(updated),
    });
  }

  return updated;
}

export function serializePayment(payment: Payment) {
  return {
    id: payment.publicId,
    amount: payment.amount,
    asset: payment.asset,
    status: payment.status,
    description: payment.description,
    metadata: payment.metadata,
    checkout_url: getCheckoutUrl(payment.publicId),
    tx_hash: payment.txHash,
    confirmed_at: payment.confirmedAt,
    expires_at: payment.expiresAt,
    created_at: payment.createdAt,
  };
}

export async function listCompletedPayments(organizationId: string) {
  return db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed")
      )
    )
    .orderBy(desc(payments.createdAt));
}
