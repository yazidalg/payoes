import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, payments, type Organization } from "@/lib/db/schema";
import { serializePaymentAssets } from "@/lib/assets/serialize";
import type { SettlementConversionRow } from "@/lib/payments/types";
import { isStellarTransactionHash } from "@/lib/stellar/transaction-hash";

export type SettlementSortOrder = "asc" | "desc";

export type ListSettlementsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  conversionType?: "path" | "direct";
  sortOrder?: SettlementSortOrder;
};

function isOnChainSettlementPayment(payment: typeof payments.$inferSelect) {
  if (payment.metadata?.manual === "true") {
    return false;
  }

  return isStellarTransactionHash(payment.txHash);
}

function mapSettlementRow(
  payment: typeof payments.$inferSelect,
  invoiceMap: Map<string, string>,
): SettlementConversionRow {
  const assets = serializePaymentAssets(payment);

  return {
    payment_id: payment.publicId,
    invoice_id: payment.invoiceId
      ? (invoiceMap.get(payment.invoiceId) ?? null)
      : null,
    paid_asset: assets.paid_asset,
    quoted_paid_amount: payment.quotedPaidAmount ?? payment.amount,
    settlement_asset: assets.settlement_asset,
    quoted_settlement_amount: payment.quotedSettlementAmount ?? payment.amount,
    platform_fee_amount: payment.platformFeeAmount,
    merchant_settlement_amount: payment.merchantSettlementAmount,
    pricing_amount: payment.pricingAmount,
    pricing_currency: payment.pricingCurrency,
    quote_rate: payment.quoteRate,
    settlement_quote_rate: payment.settlementQuoteRate,
    tx_hash: isStellarTransactionHash(payment.txHash) ? payment.txHash : null,
    confirmed_at: payment.confirmedAt?.toISOString() ?? null,
    converted_on_chain:
      payment.paidAsset !== payment.settlementAsset &&
      Boolean(payment.quotedSettlementAmount),
  };
}

async function loadSettlementRows(
  organizationId: string,
  environment: Organization["environment"],
  limit = 500,
) {
  const completed = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.environment, environment),
        eq(payments.status, "completed"),
      ),
    )
    .orderBy(desc(payments.confirmedAt))
    .limit(limit);

  const filtered = completed.filter(
    (payment) =>
      isOnChainSettlementPayment(payment) &&
      payment.paidAsset &&
      (payment.paidAsset !== payment.settlementAsset ||
        Boolean(payment.quotedSettlementAmount)),
  );

  const invoiceIds = filtered
    .map((payment) => payment.invoiceId)
    .filter((id): id is string => Boolean(id));

  const invoiceRows =
    invoiceIds.length > 0
      ? await db
          .select({ id: invoices.id, publicId: invoices.publicId })
          .from(invoices)
          .where(inArray(invoices.id, invoiceIds))
      : [];

  const invoiceMap = new Map(
    invoiceRows.map((row) => [row.id, row.publicId] as const),
  );

  return filtered.map((payment) => mapSettlementRow(payment, invoiceMap));
}

export async function listSettlementConversions(
  organizationId: string,
  environment: Organization["environment"],
  limit = 100,
) {
  const rows = await loadSettlementRows(organizationId, environment, limit);
  return rows.slice(0, limit);
}

export async function listSettlementConversionsPaginated(
  organizationId: string,
  environment: Organization["environment"],
  query: ListSettlementsQuery = {},
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const search = query.search?.trim().toLowerCase();
  const sortOrder = query.sortOrder ?? "desc";

  let rows = await loadSettlementRows(organizationId, environment);

  if (search) {
    rows = rows.filter(
      (row) =>
        row.payment_id.toLowerCase().includes(search) ||
        row.tx_hash?.toLowerCase().includes(search) ||
        row.invoice_id?.toLowerCase().includes(search),
    );
  }

  if (query.conversionType === "path") {
    rows = rows.filter((row) => row.converted_on_chain);
  } else if (query.conversionType === "direct") {
    rows = rows.filter((row) => !row.converted_on_chain);
  }

  rows.sort((a, b) => {
    const aTime = a.confirmed_at ? new Date(a.confirmed_at).getTime() : 0;
    const bTime = b.confirmed_at ? new Date(b.confirmed_at).getTime() : 0;
    return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
  });

  const total = rows.length;
  const offset = (page - 1) * pageSize;

  return {
    settlements: rows.slice(offset, offset + pageSize),
    total,
  };
}
