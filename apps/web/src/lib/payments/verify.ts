import {
  getCustomerById,
  linkCustomerToPayment,
  upsertCustomerFromWallet,
} from "@/lib/customers/service";
import type { Payment } from "@/lib/db/schema";
import {
  getPaymentByPublicId,
  updatePaymentStatus,
} from "@/lib/payments/service";
import { ensurePayablePayment } from "@/lib/payments/quote-service";
import { confirmEscrowDepositWithTxHash } from "@/lib/payments/settlement/escrow";
import { isQuoteExpired } from "@/lib/pricing/quotes";
import {
  verifyPathPaymentStrictReceiveOnHorizon,
  verifyPaymentOnHorizon,
} from "@/lib/stellar/payments";

async function resolveCustomerForCompletedPayment(
  payment: Payment,
  payerAddress: string
) {
  if (payment.customerId) {
    const customer = await getCustomerById(
      payment.customerId,
      payment.organizationId,
      payment.environment
    );

    if (customer) {
      const linked = await linkCustomerToPayment({
        customer,
        stellarAddress: payerAddress,
      });

      return linked.id;
    }
  }

  const customer = await upsertCustomerFromWallet({
    organizationId: payment.organizationId,
    environment: payment.environment,
    stellarAddress: payerAddress,
  });

  return customer.id;
}

export async function confirmPaymentWithTxHash(
  publicId: string,
  txHash: string
) {
  let payment = await getPaymentByPublicId(publicId);

  if (!payment) {
    return { ok: false as const, error: "Payment not found" };
  }

  if (payment.status === "completed") {
    return { ok: true as const, payment };
  }

  const payable = await ensurePayablePayment(payment);

  if (payable.error) {
    return { ok: false as const, error: payable.error };
  }

  payment = payable.payment;

  if (payment.paymentFlow === "escrow") {
    return confirmEscrowDepositWithTxHash(publicId, txHash);
  }

  if (payment.quoteExpiresAt && isQuoteExpired(payment.quoteExpiresAt)) {
    return {
      ok: false as const,
      error: "Rate lock expired. Wait for the rate to refresh and try again.",
    };
  }

  const paidAssetCode = payment.paidAsset ?? payment.settlementAsset;
  const paidAssetIssuer = payment.paidAsset
    ? payment.paidAssetIssuer
    : payment.settlementAssetIssuer;

  const usesPathSettlement = Boolean(
    payment.quotedSettlementAmount &&
      payment.paidAsset &&
      payment.paidAsset !== payment.settlementAsset
  );

  try {
    if (usesPathSettlement) {
      const verification = await verifyPathPaymentStrictReceiveOnHorizon({
        txHash,
        destination: payment.receivingAddress,
        destAmount: payment.quotedSettlementAmount!,
        destAsset: {
          assetCode: payment.settlementAsset,
          issuerAddress: payment.settlementAssetIssuer,
        },
        environment: payment.environment,
        slippageBps: 50,
      });

      if (!verification.valid) {
        if (verification.reason === "Transaction was not successful") {
          await updatePaymentStatus(payment, "failed");
        }

        return { ok: false as const, error: verification.reason };
      }

      const customerId = await resolveCustomerForCompletedPayment(
        payment,
        verification.payerAddress
      );

      const updated = await updatePaymentStatus(payment, "completed", {
        txHash,
        confirmedAt: new Date(),
        customerId,
        payerAddress: verification.payerAddress,
        paidAsset: verification.paidAsset,
      });

      return { ok: true as const, payment: updated };
    }

    const verification = await verifyPaymentOnHorizon({
      txHash,
      destination: payment.receivingAddress,
      amount: payment.quotedPaidAmount ?? payment.amount,
      asset: {
        assetCode: paidAssetCode,
        issuerAddress: paidAssetIssuer,
      },
      environment: payment.environment,
      memo: payment.memo,
      slippageBps: payment.quotedPaidAmount ? 50 : undefined,
      requireMemoMatch: true,
    });

    if (!verification.valid) {
      if (verification.reason === "Transaction was not successful") {
        await updatePaymentStatus(payment, "failed");
      }

      return { ok: false as const, error: verification.reason };
    }

    const customerId = await resolveCustomerForCompletedPayment(
      payment,
      verification.payerAddress
    );

    const paidAsset =
      payment.paidAsset && paidAssetCode
        ? {
            asset_code: paidAssetCode,
            issuer_address: paidAssetIssuer,
          }
        : {
            asset_code: payment.settlementAsset,
            issuer_address: payment.settlementAssetIssuer,
          };

    const updated = await updatePaymentStatus(payment, "completed", {
      txHash,
      confirmedAt: new Date(),
      customerId,
      payerAddress: verification.payerAddress,
      paidAsset,
    });

    return { ok: true as const, payment: updated };
  } catch {
    return { ok: false as const, error: "Unable to verify transaction" };
  }
}

export function isPaymentExpired(payment: Payment) {
  return Boolean(payment.expiresAt && payment.expiresAt < new Date());
}
