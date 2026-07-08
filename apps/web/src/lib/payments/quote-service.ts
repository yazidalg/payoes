import { eq } from "drizzle-orm";
import { findAllowedAsset } from "@/lib/assets/types";
import type { AllowedAsset } from "@/lib/assets/types";
import { db } from "@/lib/db";
import { invoices, payments, type Payment } from "@/lib/db/schema";
import { isInvoiceCurrencyCode } from "@/lib/invoices/currencies";
import { DEFAULT_PAYMENT_SESSION_HOURS } from "@/constants/payments/defaults";
import { buildPaymentQuote, isQuoteExpired } from "@/lib/pricing/quotes";
import {
  applyPaymentQuote,
  setPaymentPaidAsset,
  updatePaymentStatus,
} from "@/lib/payments/service";

export function isPaymentSessionExpired(payment: Payment) {
  return Boolean(payment.expiresAt && payment.expiresAt.getTime() <= Date.now());
}

export function needsPaymentQuoteRefresh(
  payment: Payment,
  paidAsset: AllowedAsset
) {
  if (!payment.pricingCurrency || !payment.pricingAmount) {
    return false;
  }

  return (
    !payment.quotedPaidAmount ||
    !payment.quoteExpiresAt ||
    isQuoteExpired(payment.quoteExpiresAt) ||
    payment.paidAsset !== paidAsset.asset_code
  );
}

async function resolveInvoiceSessionExpiry(payment: Payment) {
  if (!payment.invoiceId) {
    return payment.expiresAt;
  }

  const [invoice] = await db
    .select({
      status: invoices.status,
      dueAt: invoices.dueAt,
    })
    .from(invoices)
    .where(eq(invoices.id, payment.invoiceId))
    .limit(1);

  if (!invoice || invoice.status !== "open") {
    return payment.expiresAt;
  }

  if (invoice.dueAt) {
    return invoice.dueAt;
  }

  return new Date(
    payment.createdAt.getTime() + DEFAULT_PAYMENT_SESSION_HOURS * 60 * 60 * 1000
  );
}

export async function ensurePayablePayment(
  payment: Payment
): Promise<{ payment: Payment; error?: string }> {
  if (payment.status === "completed") {
    return { payment, error: "Payment is already completed" };
  }

  if (payment.status === "expired" && payment.invoiceId) {
    const sessionExpiresAt = await resolveInvoiceSessionExpiry(payment);

    if (sessionExpiresAt && sessionExpiresAt > new Date()) {
      const [reopened] = await db
        .update(payments)
        .set({
          status: "pending",
          expiresAt: sessionExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id))
        .returning();

      return { payment: reopened ?? payment };
    }
  }

  if (payment.status !== "pending" && payment.status !== "failed") {
    return { payment, error: `Payment is ${payment.status}` };
  }

  if (isPaymentSessionExpired(payment)) {
    await updatePaymentStatus(payment, "expired");
    return {
      payment,
      error:
        "This payment session has expired. Ask the merchant to send a new invoice link.",
    };
  }

  return { payment };
}

export async function refreshPaymentQuote(
  payment: Payment,
  paidAsset: AllowedAsset
) {
  if (!payment.pricingCurrency || !payment.pricingAmount) {
    throw new Error("This payment does not require a conversion quote");
  }

  if (!isInvoiceCurrencyCode(payment.pricingCurrency)) {
    throw new Error("Unsupported invoice currency");
  }

  const allowed = payment.allowedAssets ?? [];
  const match = findAllowedAsset(
    allowed,
    paidAsset.asset_code,
    paidAsset.issuer_address
  );

  if (!match) {
    throw new Error("Selected asset is not allowed for this payment");
  }

  const settlementAsset: AllowedAsset = {
    asset_code: payment.settlementAsset,
    issuer_address: payment.settlementAssetIssuer,
  };

  const quote = await buildPaymentQuote({
    pricingAmount: payment.pricingAmount,
    pricingCurrency: payment.pricingCurrency,
    paidAsset: match,
    settlementAsset,
  });

  const withPaidAsset = await setPaymentPaidAsset(payment, match);
  const updated = await applyPaymentQuote(withPaidAsset, {
    paidAmount: quote.paid_amount,
    rate: quote.rate,
    expiresAt: quote.expires_at,
    settlementAmount: quote.settlement_amount,
    settlementQuoteRate: quote.settlement_quote_rate,
  });

  return { quote, payment: updated };
}
