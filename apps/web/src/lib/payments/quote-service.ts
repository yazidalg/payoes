import { eq } from "drizzle-orm";
import {
  allowedAssetsEquivalent,
  findAllowedAsset,
  resolveAllowedAsset,
} from "@/lib/assets/types";
import type { AllowedAsset } from "@/lib/assets/types";
import { db } from "@/lib/db";
import { invoices, payments, type Payment } from "@/lib/db/schema";
import { isInvoiceCurrencyCode } from "@/lib/invoices/currencies";
import { getInvoiceCheckoutSessionExpiredMessage } from "@/lib/invoices/status";
import { DEFAULT_PAYMENT_SESSION_HOURS } from "@/constants/payments/defaults";
import { buildPaymentQuote, isQuoteExpired } from "@/lib/pricing/quotes";
import { applyPaymentQuote, setPaymentPaidAsset, updatePaymentStatus } from "@/lib/payments/service";
import { isCheckoutProcessingStatus } from "@/lib/checkout/payment-state";
import {
  isRetryableFailedPayment,
  resetPaymentForRetry,
} from "@/lib/payments/retry";
import { processEscrowSettlement } from "@/lib/payments/settlement/escrow";
import { ensureEscrowPaymentRegistered } from "@/lib/soroban/escrow-contract";
import { syncEscrowOperatorTrustlines } from "@/lib/stellar/escrow/operator-trustlines";

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

  const assetChanged =
    !payment.paidAsset ||
    !allowedAssetsEquivalent(
      {
        asset_code: payment.paidAsset,
        issuer_address: payment.paidAssetIssuer,
      },
      paidAsset,
      payment.environment,
    );

  return (
    !payment.quotedPaidAmount ||
    !payment.quoteExpiresAt ||
    isQuoteExpired(payment.quoteExpiresAt) ||
    assetChanged
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

async function resolveInvoicePaymentSessionExpiredError(payment: Payment) {
  if (!payment.invoiceId) {
    return "This checkout session has expired. Ask the merchant to send a new payment link.";
  }

  const [invoice] = await db
    .select({ dueAt: invoices.dueAt })
    .from(invoices)
    .where(eq(invoices.id, payment.invoiceId))
    .limit(1);

  return getInvoiceCheckoutSessionExpiredMessage({
    due_at: invoice?.dueAt ?? null,
  });
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

  if (isRetryableFailedPayment(payment)) {
    if (isPaymentSessionExpired(payment)) {
      await updatePaymentStatus(payment, "expired");
      return {
        payment,
        error: await resolveInvoicePaymentSessionExpiredError(payment),
      };
    }

    const reopened = await resetPaymentForRetry(payment);
    return { payment: reopened };
  }

  if (isCheckoutProcessingStatus(payment.status)) {
    return { payment };
  }

  if (payment.status === "settlement_failed") {
    if (payment.settlementTxHash) {
      const repaired = await processEscrowSettlement(payment);
      return { payment: repaired };
    }

    return {
      payment,
      error:
        "Settlement could not be completed. Please contact the merchant if your funds were not returned.",
    };
  }

  if (payment.status !== "pending" && payment.status !== "failed") {
    if (payment.status === "expired") {
      return {
        payment,
        error: await resolveInvoicePaymentSessionExpiredError(payment),
      };
    }

    return { payment, error: `Payment is ${payment.status}` };
  }

  if (isPaymentSessionExpired(payment)) {
    await updatePaymentStatus(payment, "expired");
    return {
      payment,
      error: await resolveInvoicePaymentSessionExpiredError(payment),
    };
  }

  return { payment };
}

function resolveQuotePaidAsset(
  payment: Payment,
  paidAsset: AllowedAsset,
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
    paidAsset.issuer_address,
    payment.environment,
  );

  if (!match) {
    throw new Error("Selected asset is not allowed for this payment");
  }

  const settlementAsset: AllowedAsset = {
    asset_code: payment.settlementAsset,
    issuer_address: payment.settlementAssetIssuer,
  };

  return {
    match,
    settlementAsset,
    canonicalPaidAsset: resolveAllowedAsset(match, payment.environment),
  };
}

export async function previewPaymentQuote(
  payment: Payment,
  paidAsset: AllowedAsset,
) {
  const { match, settlementAsset } = resolveQuotePaidAsset(payment, paidAsset);

  return buildPaymentQuote({
    pricingAmount: payment.pricingAmount!,
    pricingCurrency: payment.pricingCurrency as Parameters<
      typeof buildPaymentQuote
    >[0]["pricingCurrency"],
    paidAsset: match,
    settlementAsset,
  });
}

export async function refreshPaymentQuote(
  payment: Payment,
  paidAsset: AllowedAsset
) {
  const { canonicalPaidAsset, settlementAsset, match } = resolveQuotePaidAsset(
    payment,
    paidAsset,
  );

  const quote = await buildPaymentQuote({
    pricingAmount: payment.pricingAmount!,
    pricingCurrency: payment.pricingCurrency as Parameters<
      typeof buildPaymentQuote
    >[0]["pricingCurrency"],
    paidAsset: match,
    settlementAsset,
  });

  const withPaidAsset = await setPaymentPaidAsset(payment, canonicalPaidAsset);
  const updated = await applyPaymentQuote(withPaidAsset, {
    paidAmount: quote.paid_amount,
    rate: quote.rate,
    expiresAt: quote.expires_at,
    settlementAmount: quote.settlement_amount,
    settlementQuoteRate: quote.settlement_quote_rate,
  });

  await syncEscrowOperatorTrustlines({
    environment: updated.environment,
    allowedAssets: updated.allowedAssets ?? [],
  });

  if (!isCheckoutProcessingStatus(updated.status)) {
    await ensureEscrowPaymentRegistered(updated);
  }

  return { quote, payment: updated };
}
