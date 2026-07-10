import { findAllowedAsset, type AllowedAsset } from "@/lib/assets/types";
import {
  ensurePayablePayment,
  needsPaymentQuoteRefresh,
  refreshPaymentQuote,
} from "@/lib/payments/quote-service";
import { confirmPaymentWithTxHash } from "@/lib/payments/verify";
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
    );

    if (!match) {
      return {
        ok: false as const,
        error: "Selected asset is not allowed for this payment",
      };
    }

    payment = await setPaymentPaidAsset(payment, paidAsset);
  }

  const payable = await ensurePayablePayment(payment);

  if (payable.error) {
    return { ok: false as const, error: payable.error };
  }

  payment = payable.payment;

  const activePaidAsset: AllowedAsset = {
    asset_code: payment.paidAsset ?? payment.settlementAsset,
    issuer_address: payment.paidAsset
      ? payment.paidAssetIssuer
      : payment.settlementAssetIssuer,
  };

  if (
    payment.pricingCurrency &&
    payment.pricingAmount &&
    needsPaymentQuoteRefresh(payment, activePaidAsset)
  ) {
    const refreshed = await refreshPaymentQuote(payment, activePaidAsset);
    payment = refreshed.payment;
  }

  try {
    const submitted = await submitSandboxPaymentTransaction(payment);
    const confirmed = await confirmPaymentWithTxHash(
      payment.publicId,
      submitted.txHash,
    );

    if (!confirmed.ok) {
      return { ok: false as const, error: confirmed.error };
    }

    return { ok: true as const, payment: confirmed.payment };
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
