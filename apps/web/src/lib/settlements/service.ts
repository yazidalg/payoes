import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, payments, type Organization } from "@/lib/db/schema";
import { serializePaymentAssets } from "@/lib/assets/serialize";

export async function listSettlementConversions(
  organizationId: string,
  environment: Organization["environment"],
  limit = 100
) {
  const completed = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.environment, environment),
        eq(payments.status, "completed")
      )
    )
    .orderBy(desc(payments.confirmedAt))
    .limit(limit);

  const filtered = completed.filter(
    (payment) =>
      payment.paidAsset &&
      (payment.paidAsset !== payment.settlementAsset ||
        Boolean(payment.quotedSettlementAmount))
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
    invoiceRows.map((row) => [row.id, row.publicId] as const)
  );

  return filtered.map((payment) => {
    const assets = serializePaymentAssets(payment);

    return {
      payment_id: payment.publicId,
      invoice_id: payment.invoiceId
        ? (invoiceMap.get(payment.invoiceId) ?? null)
        : null,
      paid_asset: assets.paid_asset,
      quoted_paid_amount: payment.quotedPaidAmount ?? payment.amount,
      settlement_asset: assets.settlement_asset,
      quoted_settlement_amount:
        payment.quotedSettlementAmount ?? payment.amount,
      pricing_amount: payment.pricingAmount,
      pricing_currency: payment.pricingCurrency,
      quote_rate: payment.quoteRate,
      settlement_quote_rate: payment.settlementQuoteRate,
      tx_hash: payment.txHash,
      confirmed_at: payment.confirmedAt,
      converted_on_chain:
        payment.paidAsset !== payment.settlementAsset &&
        Boolean(payment.quotedSettlementAmount),
    };
  });
}
