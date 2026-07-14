import { and, eq, inArray } from "drizzle-orm";
import { findAllowedAsset } from "@/lib/assets/types";
import type { AllowedAsset } from "@/lib/assets/types";
import {
  calculateMerchantSettlementAmount,
} from "@/constants/payments/defaults";
import { db } from "@/lib/db";
import { payments, type Payment } from "@/lib/db/schema";
import {
  getPaymentByPublicId,
  serializePayment,
  updatePaymentStatus,
} from "@/lib/payments/service";
import {
  REFUND_REASONS,
  type RefundReason,
} from "@/lib/payments/settlement/constants";
import {
  amountsWithinSlippage,
  applySendMaxBuffer,
  assetsMatch,
  isQuoteExpired,
} from "@/lib/pricing/quotes";
import { getEscrowConfig } from "@/lib/stellar/escrow/config";
import {
  submitEscrowPathPayment,
  submitEscrowPayment,
} from "@/lib/stellar/escrow/submit";
import {
  isEscrowDepositAlreadyReleasedError,
  isLiquiditySettlementError,
} from "@/lib/stellar/errors";
import { isSorobanConfigured } from "@/lib/soroban/config";
import {
  recordEscrowRefundOnContract,
  recordEscrowSettlementOnContract,
  refundHeldEscrowDepositOnContract,
  releaseEscrowDepositToOperator,
  settleSameAssetEscrowDepositOnContract,
} from "@/lib/soroban/escrow-contract";
import { dispatchWebhookEvent } from "@/lib/webhooks/delivery";
import { isPaymentSessionExpired } from "@/lib/payments/quote-service";

function settlementAsset(payment: Payment): AllowedAsset {
  return {
    asset_code: payment.settlementAsset,
    issuer_address: payment.settlementAssetIssuer,
  };
}

function paidAsset(payment: Payment): AllowedAsset {
  return {
    asset_code: payment.paidAsset ?? payment.settlementAsset,
    issuer_address: payment.paidAsset
      ? payment.paidAssetIssuer
      : payment.settlementAssetIssuer,
  };
}

function requiresCrossAssetSettlement(payment: Payment) {
  return Boolean(
    payment.quotedSettlementAmount &&
      payment.paidAsset &&
      !assetsMatch(paidAsset(payment), settlementAsset(payment))
  );
}

async function syncEscrowContractSettlement(
  payment: Payment,
  payerAddress: string,
  grossAmount: string,
  merchantAmount: string
) {
  if (!isSorobanConfigured(payment.environment)) {
    return;
  }

  try {
    await recordEscrowSettlementOnContract({
      payment,
      payerAddress,
      grossAmount,
      merchantAmount,
    });
  } catch (error) {
    console.error("Failed to record escrow settlement on contract:", error);
  }
}

async function syncEscrowContractRefund(
  payment: Payment,
  payerAddress: string,
  amount: string,
  reason: RefundReason
) {
  if (!isSorobanConfigured(payment.environment)) {
    return;
  }

  try {
    await recordEscrowRefundOnContract({
      payment,
      payerAddress,
      amount,
      reason,
    });
  } catch (error) {
    console.error("Failed to record escrow refund on contract:", error);
  }
}

async function dispatchEscrowWebhook(
  payment: Payment,
  event: "payment.refunded" | "payment.settlement_failed"
) {
  await dispatchWebhookEvent({
    organizationId: payment.organizationId,
    environment: payment.environment,
    event,
    payload: serializePayment(payment),
  });
}

async function patchPayment(
  payment: Payment,
  values: Partial<typeof payments.$inferInsert>
) {
  const [updated] = await db
    .update(payments)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(payments.id, payment.id))
    .returning();

  return updated;
}

export async function registerEscrowDeposit(input: {
  payment: Payment;
  depositTxHash: string;
  payerAddress: string;
  receivedAmount: string;
  paidAsset: AllowedAsset;
}) {
  if (input.payment.depositTxHash === input.depositTxHash) {
    return input.payment;
  }

  const withDeposit = await patchPayment(input.payment, {
    status: "deposit_received",
    depositTxHash: input.depositTxHash,
    payerAddress: input.payerAddress,
    receivedAmount: input.receivedAmount,
    paidAsset: input.paidAsset.asset_code,
    paidAssetIssuer: input.paidAsset.issuer_address,
  });

  if (isWrongAsset(input.payment, input.paidAsset)) {
    return executeRefund(
      withDeposit,
      REFUND_REASONS.wrong_asset,
      input.receivedAmount,
      input.payerAddress
    );
  }

  return processEscrowSettlement(withDeposit);
}

async function executeRefund(
  payment: Payment,
  reason: RefundReason,
  amount: string,
  payerAddress: string
) {
  const escrow = getEscrowConfig(payment.environment);
  const asset = paidAsset(payment);

  const refunding = await patchPayment(payment, {
    status: "refunding",
    refundReason: reason,
  });

  try {
    if (requiresCrossAssetSettlement(refunding)) {
      await refundHeldEscrowDepositOnContract({
        payment: refunding,
        payerAddress,
        reason,
      });

      const refunded = await patchPayment(refunding, {
        status: "refunded",
        refundTxHash: refunding.depositTxHash,
        txHash: refunding.depositTxHash,
      });

      await dispatchEscrowWebhook(refunded, "payment.refunded");
      return refunded;
    }

    const result = await submitEscrowPayment({
      keypair: escrow.keypair,
      destinationPublicKey: payerAddress,
      amount,
      asset: {
        assetCode: asset.asset_code,
        issuerAddress: asset.issuer_address,
      },
      environment: payment.environment,
      memo: `refund:${payment.publicId.slice(0, 20)}`,
    });

    const refunded = await patchPayment(refunding, {
      status: "refunded",
      refundTxHash: result.hash,
      txHash: result.hash,
    });

    await syncEscrowContractRefund(refunded, payerAddress, amount, reason);
    await dispatchEscrowWebhook(refunded, "payment.refunded");
    return refunded;
  } catch {
    await patchPayment(refunding, {
      status: "settlement_failed",
      refundReason: reason,
    });
    await dispatchEscrowWebhook(refunding, "payment.settlement_failed");
    return refunding;
  }
}

function isUnderpay(payment: Payment, receivedAmount: string) {
  const expected = payment.quotedPaidAmount ?? payment.amount;
  return !amountsWithinSlippage(expected, receivedAmount, 50);
}

function isWrongAsset(payment: Payment, received: AllowedAsset) {
  const allowed = payment.allowedAssets ?? [];
  const allowedMatch = findAllowedAsset(
    allowed,
    received.asset_code,
    received.issuer_address
  );

  if (!allowedMatch) {
    return true;
  }

  if (!payment.paidAsset) {
    return false;
  }

  const expected: AllowedAsset = {
    asset_code: payment.paidAsset,
    issuer_address: payment.paidAssetIssuer,
  };

  return !assetsMatch(received, expected);
}

async function releaseEscrowDepositIfNeeded(payment: Payment) {
  try {
    await releaseEscrowDepositToOperator(payment);
  } catch (error) {
    if (isEscrowDepositAlreadyReleasedError(error)) {
      return;
    }

    throw error;
  }
}

async function settleCrossAssetEscrowPayment(input: {
  settling: Payment;
  escrow: ReturnType<typeof getEscrowConfig>;
  receivedAsset: AllowedAsset;
  receivedAmount: string;
}) {
  const { settling, escrow, receivedAsset, receivedAmount } = input;

  await releaseEscrowDepositIfNeeded(settling);

  const paidAssetInput = {
    assetCode: receivedAsset.asset_code,
    issuerAddress: receivedAsset.issuer_address,
  };

  try {
    const result = await submitEscrowPathPayment({
      keypair: escrow.keypair,
      destinationPublicKey: settling.receivingAddress,
      sendAsset: paidAssetInput,
      sendMax: applySendMaxBuffer(receivedAmount),
      destAsset: {
        assetCode: settling.settlementAsset,
        issuerAddress: settling.settlementAssetIssuer,
      },
      destAmount: settling.quotedSettlementAmount!,
      environment: settling.environment,
      memo: settling.memo,
    });

    return {
      result,
      grossAmount: receivedAmount,
      merchantAmount:
        settling.quotedSettlementAmount ??
        calculateMerchantSettlementAmount(receivedAmount),
    };
  } catch (pathError) {
    if (!isLiquiditySettlementError(pathError)) {
      throw pathError;
    }

    const merchantAmount =
      settling.merchantSettlementAmount ??
      calculateMerchantSettlementAmount(receivedAmount);

    const result = await submitEscrowPayment({
      keypair: escrow.keypair,
      destinationPublicKey: settling.receivingAddress,
      amount: merchantAmount,
      asset: paidAssetInput,
      environment: settling.environment,
      memo: settling.memo,
    });

    return {
      result,
      grossAmount: receivedAmount,
      merchantAmount,
    };
  }
}

export async function processEscrowSettlement(payment: Payment) {
  if (payment.paymentFlow !== "escrow") {
    return payment;
  }

  if (payment.status === "refunded" || payment.status === "expired") {
    return payment;
  }

  if (payment.status === "completed" && payment.settlementTxHash) {
    return payment;
  }

  if (!payment.depositTxHash || !payment.payerAddress || !payment.receivedAmount) {
    return payment;
  }

  const receivedAsset = paidAsset(payment);
  const payerAddress = payment.payerAddress;
  const receivedAmount = payment.receivedAmount;

  if (isUnderpay(payment, receivedAmount)) {
    return executeRefund(
      payment,
      REFUND_REASONS.underpay,
      receivedAmount,
      payerAddress
    );
  }

  if (isPaymentSessionExpired(payment)) {
    return executeRefund(
      payment,
      REFUND_REASONS.expired,
      receivedAmount,
      payerAddress
    );
  }

  if (payment.quoteExpiresAt && isQuoteExpired(payment.quoteExpiresAt)) {
    return executeRefund(
      payment,
      REFUND_REASONS.quote_expired,
      receivedAmount,
      payerAddress
    );
  }

  const settling =
    payment.status === "completed"
      ? payment
      : await patchPayment(payment, { status: "settling" });
  const escrow = getEscrowConfig(payment.environment);
  const merchantAmount =
    payment.merchantSettlementAmount ??
    payment.quotedSettlementAmount ??
    payment.quotedPaidAmount ??
    payment.amount;

  try {
    if (requiresCrossAssetSettlement(settling)) {
      const settlement = await settleCrossAssetEscrowPayment({
        settling,
        escrow,
        receivedAsset,
        receivedAmount,
      });

      const completed =
        settling.status === "completed"
          ? settling
          : await updatePaymentStatus(settling, "completed", {
              txHash: settling.depositTxHash ?? settling.txHash ?? undefined,
              confirmedAt: settling.confirmedAt ?? new Date(),
              payerAddress,
              paidAsset: receivedAsset,
            });

      const finalized = await patchPayment(completed, {
        settlementTxHash: settlement.result.hash,
        txHash: settlement.result.hash,
      });

      await syncEscrowContractSettlement(
        finalized,
        payerAddress,
        settlement.grossAmount,
        settlement.merchantAmount
      );

      return finalized;
    }

    const result = await settleSameAssetEscrowDepositOnContract({
      payment: settling,
      payerAddress,
    });

    const completed =
      settling.status === "completed"
        ? settling
        : await updatePaymentStatus(settling, "completed", {
            txHash: settling.depositTxHash ?? settling.txHash ?? undefined,
            confirmedAt: settling.confirmedAt ?? new Date(),
            payerAddress,
            paidAsset: receivedAsset,
          });

    const finalized = await patchPayment(completed, {
      settlementTxHash: result.hash,
    });

    await syncEscrowContractSettlement(
      finalized,
      payerAddress,
      receivedAmount,
      merchantAmount
    );

    return finalized;
  } catch (error) {
    const reason =
      error instanceof Error &&
      isLiquiditySettlementError(error)
        ? REFUND_REASONS.no_liquidity
        : REFUND_REASONS.settle_failed;

    const failed = await patchPayment(settling, {
      ...(settling.status === "completed"
        ? { refundReason: reason }
        : { status: "settlement_failed", refundReason: reason }),
    });

    await dispatchEscrowWebhook(failed, "payment.settlement_failed");

    return failed;
  }
}

export async function confirmEscrowDepositWithTxHash(
  publicId: string,
  txHash: string
) {
  let payment = await getPaymentByPublicId(publicId);

  if (!payment) {
    return { ok: false as const, error: "Payment not found" };
  }

  if (payment.paymentFlow !== "escrow") {
    return {
      ok: false as const,
      error: "This payment uses a deprecated flow. Create a new payment to continue.",
    };
  }

  if (payment.status === "completed") {
    return { ok: true as const, payment };
  }

  return {
    ok: false as const,
    error:
      "Classic escrow deposit confirmation is no longer supported. Complete checkout through the Soroban escrow contract.",
  };
}

export async function processPendingEscrowSettlements() {
  const pending = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.paymentFlow, "escrow"),
        inArray(payments.status, [
          "deposit_received",
          "settling",
          "settlement_failed",
          "completed",
        ])
      )
    );

  let processed = 0;

  for (const payment of pending) {
    if (payment.status === "completed" && payment.settlementTxHash) {
      continue;
    }

    await processEscrowSettlement(payment);
    processed += 1;
  }

  return processed;
}

export async function detectEscrowDepositsFromHorizon(
  _environment: Payment["environment"]
) {
  return 0;
}

export async function runEscrowSettlementWorker() {
  const environments: Payment["environment"][] = ["sandbox", "production"];
  let detected = 0;
  let processed = 0;

  for (const environment of environments) {
    try {
      detected += await detectEscrowDepositsFromHorizon(environment);
    } catch {
      // Escrow may not be configured for this environment.
    }
  }

  processed = await processPendingEscrowSettlements();

  return { detected, processed };
}
