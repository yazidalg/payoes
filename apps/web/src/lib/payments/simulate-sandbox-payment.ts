import { findAllowedAsset, type AllowedAsset } from "@/lib/assets/types";
import {
  ensurePayablePayment,
  needsPaymentQuoteRefresh,
  refreshPaymentQuote,
} from "@/lib/payments/quote-service";
import {
  getPaymentByPublicId,
  setPaymentPaidAsset,
} from "@/lib/payments/service";
import { submitSandboxPaymentTransaction } from "@/lib/stellar/submit-sandbox-payment";

export async function simulateSandboxPayment(
  publicId: string,
  paidAsset?: AllowedAsset,
) {
  let payment = await getPaymentByPublicId(publicId);

  if (!payment) {
    return { ok: false as const, error: "Payment not found" };
  }

  if (payment.environment !== "sandbox") {
    return {
      ok: false as const,
      error: "Simulation is only available in sandbox mode",
    };
  }

  if (payment.status === "completed") {
    return { ok: true as const, payment };
  }

  if (paidAsset) {
    const match = findAllowedAsset(
      payment.allowedAssets ?? [],
      paidAsset.asset_code,
      paidAsset.issuer_address,
      payment.environment,
    );

    if (!match) {
      return {
        ok: false as const,
        error: "Selected asset is not allowed for this payment",
      };
    }

    const shouldRefreshQuote =
      payment.pricingCurrency &&
      payment.pricingAmount &&
      needsPaymentQuoteRefresh(payment, paidAsset);

    if (shouldRefreshQuote) {
      const refreshed = await refreshPaymentQuote(payment, paidAsset);
      payment = refreshed.payment;
    } else {
      payment = await setPaymentPaidAsset(payment, paidAsset);
    }
  }

  const payable = await ensurePayablePayment(payment);

  if (payable.error) {
    return { ok: false as const, error: payable.error };
  }

  payment = payable.payment;

  try {
    const submitted = await submitSandboxPaymentTransaction(payment);
    return { ok: true as const, payment: submitted.payment };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Unable to simulate sandbox payment",
    };
  }
}
