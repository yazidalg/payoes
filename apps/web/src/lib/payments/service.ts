import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, payments, type Organization, type Payment } from "@/lib/db/schema";
import type { AllowedAsset } from "@/lib/assets/types";
import { resolveAssetConfig } from "@/lib/assets/config";
import {
  dbAllowedAssets,
  serializePaymentAssets,
} from "@/lib/assets/serialize";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import { requireReceivingWallet } from "@/lib/organizations/wallet";
import { getCustomerByPublicId } from "@/lib/customers/service";
import { normalizeStellarAmount } from "@/lib/stellar/amount";
import { DEFAULT_AUTH_URL } from "@/constants/app";
import {
  DEFAULT_PAYMENT_EXPIRY_MINUTES,
  PLACEHOLDER_PRICING_PAYMENT_AMOUNT,
} from "@/constants/payments/defaults";

import { dispatchWebhookEvent } from "@/lib/webhooks/delivery";

function createPublicId() {
  return `pay_${randomBytes(12).toString("base64url")}`;
}

export function getCheckoutUrl(publicId: string) {
  const baseUrl = process.env.AUTH_URL ?? DEFAULT_AUTH_URL;
  return `${baseUrl}/c/${publicId}`;
}

export async function listPayments(
  organizationId: string,
  environment: Organization["environment"],
  limit = 50
) {
  return db
    .select()
    .from(payments)
    .where(organizationEnvironmentWhere(payments.organizationId, payments.environment, organizationId, environment))
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

export async function getPaymentForOrganization(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const payment = await getPaymentByPublicId(publicId);

  if (
    !payment ||
    payment.organizationId !== organizationId ||
    payment.environment !== environment
  ) {
    return null;
  }

  return payment;
}

export async function getPaymentById(
  id: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, id),
        eq(payments.organizationId, organizationId),
        eq(payments.environment, environment)
      )
    )
    .limit(1);

  return payment ?? null;
}

export async function expireStalePayments(
  organizationId: string,
  environment: Organization["environment"]
) {
  const now = new Date();
  const stale = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.environment, environment),
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
  settlementAsset?: AllowedAsset | null;
  allowedAssets?: AllowedAsset[] | null;
  description?: string | null;
  metadata?: Record<string, string> | null;
  expiresInMinutes?: number;
  customerId?: string | null;
  sourceType?: Payment["sourceType"];
  paymentLinkId?: string | null;
  invoiceId?: string | null;
  subscriptionId?: string | null;
  pricingCurrency?: string | null;
  pricingAmount?: string | null;
}) {
  const wallet = await requireReceivingWallet(
    input.organizationId,
    input.environment
  );

  const assetConfig = await resolveAssetConfig({
    organizationId: input.organizationId,
    settlementAsset: input.settlementAsset,
    allowedAssets: input.allowedAssets,
  });

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
    Date.now() + (input.expiresInMinutes ?? DEFAULT_PAYMENT_EXPIRY_MINUTES) * 60 * 1000
  );

  const publicId = createPublicId();

  const [payment] = await db
    .insert(payments)
    .values({
      publicId,
      organizationId: input.organizationId,
      customerId: customerInternalId,
      sourceType: input.sourceType ?? "direct",
      paymentLinkId: input.paymentLinkId ?? null,
      invoiceId: input.invoiceId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      environment: input.environment,
      amount: input.pricingAmount
        ? PLACEHOLDER_PRICING_PAYMENT_AMOUNT
        : normalizeStellarAmount(input.amount),
      pricingCurrency: input.pricingCurrency ?? null,
      pricingAmount: input.pricingAmount ?? null,
      settlementAsset: assetConfig.settlement_asset.asset_code,
      settlementAssetIssuer: assetConfig.settlement_asset.issuer_address,
      allowedAssets: dbAllowedAssets(assetConfig.allowed_assets),
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
    environment: input.environment,
    event: "payment.created",
    payload: serializePayment(payment, { customerPublicId }),
  });

  return payment;
}

export async function setPaymentPaidAsset(
  payment: Payment,
  paidAsset: AllowedAsset
) {
  const [updated] = await db
    .update(payments)
    .set({
      paidAsset: paidAsset.asset_code,
      paidAssetIssuer: paidAsset.issuer_address,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id))
    .returning();

  return updated;
}

export async function applyPaymentQuote(
  payment: Payment,
  quote: {
    paidAmount: string;
    rate: string;
    expiresAt: Date;
    settlementAmount?: string;
    settlementQuoteRate?: string;
  }
) {
  const [updated] = await db
    .update(payments)
    .set({
      amount: normalizeStellarAmount(quote.paidAmount),
      quotedPaidAmount: normalizeStellarAmount(quote.paidAmount),
      quotedSettlementAmount: quote.settlementAmount
        ? normalizeStellarAmount(quote.settlementAmount)
        : null,
      quoteRate: quote.rate,
      settlementQuoteRate: quote.settlementQuoteRate ?? null,
      quoteExpiresAt: quote.expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id))
    .returning();

  return updated;
}

export async function updatePaymentStatus(
  payment: Payment,
  status: Payment["status"],
  extra?: {
    txHash?: string;
    confirmedAt?: Date;
    customerId?: string | null;
    payerAddress?: string | null;
    paidAsset?: AllowedAsset | null;
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
      paidAsset:
        extra?.paidAsset !== undefined
          ? extra.paidAsset?.asset_code ?? null
          : payment.paidAsset,
      paidAssetIssuer:
        extra?.paidAsset !== undefined
          ? extra.paidAsset?.issuer_address ?? null
          : payment.paidAssetIssuer,
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
      environment: payment.environment,
      event: eventMap[status as keyof typeof eventMap],
      payload: serializePayment(updated, { customerPublicId }),
    });
  }

  const { syncCheckoutSessionWithPayment } = await import(
    "@/lib/checkout-sessions/service"
  );
  await syncCheckoutSessionWithPayment(updated);

  const { syncInvoiceWithPayment } = await import("@/lib/invoices/service");
  await syncInvoiceWithPayment(updated);

  return updated;
}

export function serializePayment(
  payment: Payment,
  options?: { customerPublicId?: string | null }
) {
  const assets = serializePaymentAssets(payment);

  return {
    id: payment.publicId,
    object: "payment_intent",
    amount: payment.amount,
    pricing_currency: payment.pricingCurrency,
    pricing_amount: payment.pricingAmount,
    quoted_paid_amount: payment.quotedPaidAmount,
    quoted_settlement_amount: payment.quotedSettlementAmount,
    quote_rate: payment.quoteRate,
    settlement_quote_rate: payment.settlementQuoteRate,
    quote_expires_at: payment.quoteExpiresAt,
    ...assets,
    status: payment.status,
    description: payment.description,
    metadata: payment.metadata,
    checkout_url: getCheckoutUrl(payment.publicId),
    source_type: payment.sourceType,
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

export async function listCompletedPayments(
  organizationId: string,
  environment: Organization["environment"]
) {
  return db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.environment, environment),
        eq(payments.status, "completed")
      )
    )
    .orderBy(desc(payments.createdAt));
}
