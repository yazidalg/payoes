import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, payments, type Organization, type Payment } from "@/lib/db/schema";
import type { AcceptedAsset } from "@/lib/organizations/wallet-constants";
import { getReceivingWallet } from "@/lib/organizations/wallet";
import { getCustomerByPublicId } from "@/lib/customers/service";
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
  customerId?: string | null;
}) {
  const wallet = await getReceivingWallet(input.organizationId, input.environment);

  if (!wallet) {
    throw new Error("Receiving wallet is not configured");
  }

  if (!wallet.acceptedAssets.includes(input.asset)) {
    throw new Error(`Asset ${input.asset} is not accepted by this organization`);
  }

  let customerInternalId: string | null = null;
  let customerPublicId: string | null = null;

  if (input.customerId) {
    const customer = await getCustomerByPublicId(input.customerId);

    if (!customer || customer.organizationId !== input.organizationId) {
      throw new Error("Customer not found");
    }

    if (customer.environment !== input.environment) {
      throw new Error("Customer environment does not match payment environment");
    }

    customerInternalId = customer.id;
    customerPublicId = customer.publicId;
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
      customerId: customerInternalId,
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
    payload: serializePayment(payment, { customerPublicId }),
  });

  return payment;
}

export async function updatePaymentStatus(
  payment: Payment,
  status: Payment["status"],
  extra?: {
    txHash?: string;
    confirmedAt?: Date;
    customerId?: string | null;
    payerAddress?: string | null;
  }
) {
  const [updated] = await db
    .update(payments)
    .set({
      status,
      txHash: extra?.txHash ?? payment.txHash,
      confirmedAt: extra?.confirmedAt ?? payment.confirmedAt,
      customerId:
        extra?.customerId !== undefined ? extra.customerId : payment.customerId,
      payerAddress:
        extra?.payerAddress !== undefined
          ? extra.payerAddress
          : payment.payerAddress,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id))
    .returning();

  const customerPublicId = updated.customerId
    ? (
        await db
          .select({ publicId: customers.publicId })
          .from(customers)
          .where(eq(customers.id, updated.customerId))
          .limit(1)
      )[0]?.publicId ?? null
    : null;

  const eventMap = {
    completed: "payment.completed",
    failed: "payment.failed",
    expired: "payment.expired",
  } as const;

  if (status in eventMap) {
    await dispatchWebhookEvent({
      organizationId: payment.organizationId,
      event: eventMap[status as keyof typeof eventMap],
      payload: serializePayment(updated, { customerPublicId }),
    });
  }

  return updated;
}

export function serializePayment(
  payment: Payment,
  options?: { customerPublicId?: string | null }
) {
  return {
    id: payment.publicId,
    amount: payment.amount,
    asset: payment.asset,
    status: payment.status,
    description: payment.description,
    metadata: payment.metadata,
    checkout_url: getCheckoutUrl(payment.publicId),
    customer_id: options?.customerPublicId ?? null,
    payer_address: payment.payerAddress,
    tx_hash: payment.txHash,
    confirmed_at: payment.confirmedAt,
    expires_at: payment.expiresAt,
    created_at: payment.createdAt,
  };
}

export async function serializePayments(paymentList: Payment[]) {
  const customerIds = paymentList
    .map((payment) => payment.customerId)
    .filter((id): id is string => Boolean(id));

  const customerRows =
    customerIds.length > 0
      ? await db
          .select({ id: customers.id, publicId: customers.publicId })
          .from(customers)
          .where(inArray(customers.id, customerIds))
      : [];

  const customerMap = new Map(
    customerRows.map((row) => [row.id, row.publicId] as const)
  );

  return paymentList.map((payment) =>
    serializePayment(payment, {
      customerPublicId: payment.customerId
        ? (customerMap.get(payment.customerId) ?? null)
        : null,
    })
  );
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
