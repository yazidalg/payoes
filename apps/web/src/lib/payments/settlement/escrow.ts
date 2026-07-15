import { and, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { Horizon } from "@stellar/stellar-sdk";
import { findAllowedAsset, allowedAssetsEquivalent } from "@/lib/assets/types";
import type { AllowedAsset } from "@/lib/assets/types";
import { isPaymentInProgressStatus } from "@/lib/checkout/payment-state";
import {
  calculateMerchantSettlementAmount,
} from "@/constants/payments/defaults";
import { db } from "@/lib/db";
import { payments, type Payment } from "@/lib/db/schema";
import {
  getPaymentByPublicId,
  setPaymentPaidAsset,
  serializePayment,
  updatePaymentStatus,
} from "@/lib/payments/service";
import {
  needsPaymentQuoteRefresh,
  refreshPaymentQuote,
} from "@/lib/payments/quote-service";
import {
  isDepositTxAlreadyHandled,
  isEscrowRefundTerminal,
  markDepositTxHandled,
} from "@/lib/payments/settlement/deposit-tracking";
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
  isSorobanPaymentAlreadyFinalizedError,
  isSorobanPaymentNotRegisteredError,
} from "@/lib/soroban/setup-errors";
import {
  recordEscrowRefundOnContract,
  recordEscrowSettlementOnContract,
  refundHeldEscrowDepositOnContract,
  registerEscrowPaymentOnContract,
  releaseEscrowDepositToOperator,
  settleSameAssetEscrowDepositOnContract,
} from "@/lib/soroban/escrow-contract";
import { getHorizonUrl } from "@/lib/stellar/network";
import {
  buildPaymentTransactionXdr,
  verifyEscrowDepositByMemo,
} from "@/lib/stellar/payments";
import { submitEscrowSignedXdr } from "@/lib/stellar/escrow/submit";
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
  if (
    input.payment.depositTxHash === input.depositTxHash ||
    isDepositTxAlreadyHandled(input.payment, input.depositTxHash)
  ) {
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

async function claimRefundAttempt(payment: Payment, reason: RefundReason) {
  const depositTxHash = payment.depositTxHash;

  const [claimed] = await db
    .update(payments)
    .set({
      status: "refunding",
      refundReason: reason,
      metadata: depositTxHash
        ? markDepositTxHandled(payment.metadata, depositTxHash)
        : payment.metadata,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(payments.id, payment.id),
        notInArray(payments.status, ["refunding", "refunded"])
      )
    )
    .returning();

  return claimed ?? null;
}

async function executeRefund(
  payment: Payment,
  reason: RefundReason,
  amount: string,
  payerAddress: string,
  options?: { depositHeld?: boolean; forceDirect?: boolean }
) {
  if (isEscrowRefundTerminal(payment)) {
    return payment;
  }

  const depositTxHash = payment.depositTxHash;
  if (depositTxHash && isDepositTxAlreadyHandled(payment, depositTxHash)) {
    return payment;
  }

  const escrow = getEscrowConfig(payment.environment);
  const asset = paidAsset(payment);

  const refunding = await claimRefundAttempt(payment, reason);
  if (!refunding) {
    return payment;
  }

  try {
    if (
      options?.depositHeld ||
      (!options?.forceDirect && requiresCrossAssetSettlement(refunding))
    ) {
      const result = await refundHeldEscrowDepositOnContract({
        payment: refunding,
        payerAddress,
        reason,
      });

      const refunded = await patchPayment(refunding, {
        status: "refunded",
        refundTxHash: result.hash,
        txHash: result.hash,
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
    const latest = (await getPaymentByPublicId(payment.publicId)) ?? refunding;

    if (latest.settlementTxHash) {
      const repaired = await patchPayment(latest, {
        status: "completed",
        refundReason: null,
        txHash: latest.settlementTxHash,
      });

      await dispatchWebhookEvent({
        organizationId: repaired.organizationId,
        environment: repaired.environment,
        event: "payment.completed",
        payload: serializePayment(repaired),
      });

      return repaired;
    }

    await patchPayment(refunding, {
      status: "settlement_failed",
      refundReason: reason,
    });
    await dispatchEscrowWebhook(refunding, "payment.settlement_failed");
    return refunding;
  }
}

async function recordManualEscrowDeposit(
  payment: Payment,
  txHash: string,
  payerAddress: string,
  receivedAmount: string,
  paidAsset: AllowedAsset,
) {
  return patchPayment(payment, {
    status: "deposit_received",
    depositTxHash: txHash,
    payerAddress,
    receivedAmount,
    paidAsset: paidAsset.asset_code,
    paidAssetIssuer: paidAsset.issuer_address,
  });
}

async function refundManualEscrowDeposit(
  payment: Payment,
  txHash: string,
  payerAddress: string,
  receivedAmount: string,
  receivedAsset: AllowedAsset,
  reason: RefundReason,
) {
  const deposited = await recordManualEscrowDeposit(
    payment,
    txHash,
    payerAddress,
    receivedAmount,
    receivedAsset,
  );

  return executeRefund(
    deposited,
    reason,
    receivedAmount,
    payerAddress,
    { forceDirect: true },
  );
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
    received.issuer_address,
    payment.environment,
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

  return !allowedAssetsEquivalent(received, expected, payment.environment);
}

async function releaseEscrowDepositIfNeeded(payment: Payment) {
  if (!isSorobanConfigured(payment.environment)) {
    return;
  }

  try {
    await releaseEscrowDepositToOperator(payment);
  } catch (error) {
    if (
      isEscrowDepositAlreadyReleasedError(error) ||
      isSorobanPaymentAlreadyFinalizedError(error) ||
      isSorobanPaymentNotRegisteredError(error)
    ) {
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
  const grossSettlementAmount =
    settling.quotedSettlementAmount ?? settling.amount;
  const merchantSettlementAmount =
    settling.merchantSettlementAmount ??
    calculateMerchantSettlementAmount(grossSettlementAmount);

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
      destAmount: merchantSettlementAmount,
      environment: settling.environment,
      memo: settling.memo,
    });

    return {
      result,
      grossAmount: grossSettlementAmount,
      merchantAmount: merchantSettlementAmount,
    };
  } catch (pathError) {
    if (!isLiquiditySettlementError(pathError)) {
      throw pathError;
    }

    const result = await submitEscrowPayment({
      keypair: escrow.keypair,
      destinationPublicKey: settling.receivingAddress,
      amount: merchantSettlementAmount,
      asset: {
        assetCode: settling.settlementAsset,
        issuerAddress: settling.settlementAssetIssuer,
      },
      environment: settling.environment,
      memo: settling.memo,
    });

    return {
      result,
      grossAmount: grossSettlementAmount,
      merchantAmount: merchantSettlementAmount,
    };
  }
}

async function repairEscrowPaymentIfSettled(payment: Payment) {
  if (payment.status !== "settlement_failed" || !payment.settlementTxHash) {
    return payment;
  }

  const repaired = await patchPayment(payment, {
    status: "completed",
    refundReason: null,
    txHash: payment.settlementTxHash,
  });

  await dispatchWebhookEvent({
    organizationId: repaired.organizationId,
    environment: repaired.environment,
    event: "payment.completed",
    payload: serializePayment(repaired),
  });

  return repaired;
}

export async function processEscrowSettlement(payment: Payment) {
  if (payment.paymentFlow !== "escrow") {
    return payment;
  }

  payment = await repairEscrowPaymentIfSettled(payment);

  if (
    payment.status === "refunded" ||
    payment.status === "expired" ||
    isEscrowRefundTerminal(payment)
  ) {
    return payment;
  }

  if (payment.status === "refunding") {
    return payment;
  }

  if (payment.status === "completed" && payment.settlementTxHash) {
    return payment;
  }

  const awaitingMerchantSettlement =
    Boolean(payment.depositTxHash) &&
    Boolean(payment.receivedAmount) &&
    !payment.settlementTxHash;

  if (
    payment.depositTxHash &&
    isDepositTxAlreadyHandled(payment, payment.depositTxHash) &&
    !awaitingMerchantSettlement
  ) {
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
      payerAddress,
      { depositHeld: payment.status === "completed" },
    );
  }

  if (isPaymentSessionExpired(payment)) {
    return executeRefund(
      payment,
      REFUND_REASONS.expired,
      receivedAmount,
      payerAddress,
      { depositHeld: payment.status === "completed" },
    );
  }

  if (payment.quoteExpiresAt && isQuoteExpired(payment.quoteExpiresAt)) {
    return executeRefund(
      payment,
      REFUND_REASONS.quote_expired,
      receivedAmount,
      payerAddress,
      { depositHeld: payment.status === "completed" },
    );
  }

  const settling =
    payment.status === "completed"
      ? payment
      : await patchPayment(payment, { status: "settling" });
  const escrow = getEscrowConfig(payment.environment);
  const merchantAmount =
    payment.merchantSettlementAmount ??
    calculateMerchantSettlementAmount(
      payment.quotedSettlementAmount ?? payment.quotedPaidAmount ?? payment.amount
    );

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

      await dispatchWebhookEvent({
        organizationId: finalized.organizationId,
        environment: finalized.environment,
        event: "payment.completed",
        payload: serializePayment(finalized),
      });

      return finalized;
    }

    const result = await settleSameAssetEscrowDepositOnContract({
      payment: settling,
      payerAddress,
    }).catch(async (contractError) => {
      if (
        !isSorobanPaymentAlreadyFinalizedError(contractError) &&
        !isSorobanPaymentNotRegisteredError(contractError)
      ) {
        throw contractError;
      }

      return submitEscrowPayment({
        keypair: escrow.keypair,
        destinationPublicKey: settling.receivingAddress,
        amount: merchantAmount,
        asset: {
          assetCode: receivedAsset.asset_code,
          issuerAddress: receivedAsset.issuer_address,
        },
        environment: settling.environment,
        memo: settling.memo,
      });
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
      payment.quotedSettlementAmount ?? payment.amount,
      merchantAmount
    );

    await dispatchWebhookEvent({
      organizationId: finalized.organizationId,
      environment: finalized.environment,
      event: "payment.completed",
      payload: serializePayment(finalized),
    });

    return finalized;
  } catch (error) {
    const latest =
      (await getPaymentByPublicId(payment.publicId)) ?? settling;

    if (latest.settlementTxHash) {
      const repaired = await patchPayment(latest, {
        status: "completed",
        refundReason: null,
        txHash: latest.settlementTxHash,
      });

      await dispatchWebhookEvent({
        organizationId: repaired.organizationId,
        environment: repaired.environment,
        event: "payment.completed",
        payload: serializePayment(repaired),
      });

      return repaired;
    }

    const reason =
      error instanceof Error &&
      isLiquiditySettlementError(error)
        ? REFUND_REASONS.no_liquidity
        : REFUND_REASONS.settle_failed;

    return executeRefund(
      settling,
      reason,
      receivedAmount,
      payerAddress,
      { depositHeld: true },
    );
  }
}

export async function buildEscrowClassicDepositTransaction(input: {
  payment: Payment;
  payerAddress: string;
  amount: string;
  paidAsset: AllowedAsset;
}) {
  if (!input.payment.depositAddress) {
    throw new Error("Escrow deposit address is not configured for this payment");
  }

  const xdr = await buildPaymentTransactionXdr({
    sourcePublicKey: input.payerAddress,
    destinationPublicKey: input.payment.depositAddress,
    amount: input.amount,
    asset: {
      assetCode: input.paidAsset.asset_code,
      issuerAddress: input.paidAsset.issuer_address,
    },
    environment: input.payment.environment,
    memo: input.payment.depositAddress.startsWith("M")
      ? null
      : input.payment.memo ?? input.payment.publicId,
  });

  return { xdr };
}

export async function submitClassicEscrowDeposit(input: {
  payment: Payment;
  signedXdr: string;
}) {
  return submitEscrowSignedXdr({
    signedXdr: input.signedXdr,
    environment: input.payment.environment,
  });
}

export async function confirmClassicEscrowDeposit(
  payment: Payment,
  txHash: string,
) {
  let fresh = (await getPaymentByPublicId(payment.publicId)) ?? payment;

  if (fresh.status === "completed") {
    return { ok: true as const, payment: fresh };
  }

  if (fresh.status === "refunded") {
    return {
      ok: false as const,
      error: "Payment was refunded.",
      payment: fresh,
    };
  }

  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      fresh = (await getPaymentByPublicId(payment.publicId)) ?? fresh;

      if (fresh.status === "completed") {
        return { ok: true as const, payment: fresh };
      }

      if (fresh.status === "refunded") {
        return {
          ok: false as const,
          error: "Payment was refunded.",
          payment: fresh,
        };
      }
    }

    const relayed = await relayManualEscrowDeposit(fresh, txHash);
    fresh = (await getPaymentByPublicId(payment.publicId)) ?? fresh;

    if (fresh.status === "completed") {
      return { ok: true as const, payment: fresh };
    }

    if (relayed) {
      fresh = (await getPaymentByPublicId(payment.publicId)) ?? fresh;
      if (fresh.status === "completed") {
        return { ok: true as const, payment: fresh };
      }
    }

    if (
      relayed ||
      fresh.status === "deposit_received" ||
      fresh.status === "settling"
    ) {
      const settled = await processEscrowSettlement(fresh);
      fresh = (await getPaymentByPublicId(payment.publicId)) ?? settled;

      if (fresh.status === "completed") {
        return { ok: true as const, payment: fresh };
      }

      return {
        ok: false as const,
        pending: true as const,
        status: fresh.status,
        payment: fresh,
      };
    }
  }

  fresh = (await getPaymentByPublicId(payment.publicId)) ?? fresh;

  if (fresh.status === "completed") {
    return { ok: true as const, payment: fresh };
  }

  if (
    fresh.status === "deposit_received" ||
    fresh.status === "settling" ||
    fresh.status === "refunding"
  ) {
    return {
      ok: false as const,
      pending: true as const,
      status: fresh.status,
      payment: fresh,
    };
  }

  return {
    ok: false as const,
    pending: true as const,
    status: fresh.status,
    payment: fresh,
    error: "Deposit not detected yet. Try again in a moment.",
  };
}

export async function confirmEscrowDepositWithTxHash(
  publicId: string,
  txHash: string
) {
  const payment = await getPaymentByPublicId(publicId);

  if (!payment) {
    return { ok: false as const, error: "Payment not found" };
  }

  if (payment.paymentFlow !== "escrow") {
    return {
      ok: false as const,
      error: "This payment uses a deprecated flow. Create a new payment to continue.",
    };
  }

  const result = await confirmClassicEscrowDeposit(payment, txHash);

  if (result.ok) {
    return { ok: true as const, payment: result.payment };
  }

  if ("pending" in result && result.pending) {
    return {
      ok: false as const,
      error: "Deposit is still processing.",
    };
  }

  return { ok: false as const, error: result.error ?? "Unable to confirm deposit" };
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

    if (payment.status === "refunding" || isEscrowRefundTerminal(payment)) {
      continue;
    }

    const awaitingMerchantSettlement =
      Boolean(payment.depositTxHash) &&
      Boolean(payment.receivedAmount) &&
      !payment.settlementTxHash;

    if (
      payment.depositTxHash &&
      isDepositTxAlreadyHandled(payment, payment.depositTxHash) &&
      !awaitingMerchantSettlement
    ) {
      continue;
    }

    await processEscrowSettlement(payment);
    processed += 1;
  }

  return processed;
}

async function relayManualEscrowDeposit(payment: Payment, txHash: string) {
  if (!payment.depositAddress) {
    return false;
  }

  const inbound = await verifyEscrowDepositByMemo({
    txHash,
    destination: payment.depositAddress,
    environment: payment.environment,
    memo: payment.depositAddress.startsWith("M")
      ? null
      : payment.memo ?? payment.publicId,
  });

  if (!inbound.valid) {
    return false;
  }

  if (
    payment.depositTxHash === txHash &&
    (payment.status === "deposit_received" ||
      payment.status === "settling" ||
      payment.status === "settlement_failed")
  ) {
    const result = await processEscrowSettlement(payment);
    return result.status === "refunded" || result.status === "completed";
  }

  if (payment.status === "refunding") {
    return false;
  }

  if (isDepositTxAlreadyHandled(payment, txHash)) {
    return false;
  }

  let activePayment = payment;

  const allowed = findAllowedAsset(
    activePayment.allowedAssets ?? [],
    inbound.paidAsset.asset_code,
    inbound.paidAsset.issuer_address,
    activePayment.environment,
  );

  if (!allowed) {
    const refunded = await refundManualEscrowDeposit(
      activePayment,
      txHash,
      inbound.payerAddress,
      inbound.receivedAmount,
      inbound.paidAsset,
      REFUND_REASONS.wrong_asset,
    );
    return refunded.status === "refunded";
  }

  try {
    const selectedPaidAsset: AllowedAsset | null = activePayment.paidAsset
      ? {
          asset_code: activePayment.paidAsset,
          issuer_address: activePayment.paidAssetIssuer,
        }
      : null;
    const depositMatchesSelection =
      selectedPaidAsset !== null &&
      allowedAssetsEquivalent(
        selectedPaidAsset,
        inbound.paidAsset,
        activePayment.environment,
      );

    if (
      activePayment.pricingCurrency &&
      activePayment.pricingAmount &&
      needsPaymentQuoteRefresh(activePayment, allowed)
    ) {
      activePayment = (
        await refreshPaymentQuote(activePayment, allowed)
      ).payment;
    } else if (!selectedPaidAsset || !depositMatchesSelection) {
      activePayment = await setPaymentPaidAsset(activePayment, allowed);
      try {
        await registerEscrowPaymentOnContract(activePayment);
      } catch (error) {
        if (!isSorobanPaymentAlreadyFinalizedError(error)) {
          throw error;
        }
      }
    }

    const expectedAmount = activePayment.quotedPaidAmount ?? activePayment.amount;
    if (isUnderpay(activePayment, inbound.receivedAmount)) {
      const refunded = await refundManualEscrowDeposit(
        activePayment,
        txHash,
        inbound.payerAddress,
        inbound.receivedAmount,
        inbound.paidAsset,
        REFUND_REASONS.underpay,
      );
      return refunded.status === "refunded";
    }

    const deposited = await recordManualEscrowDeposit(
      activePayment,
      txHash,
      inbound.payerAddress,
      inbound.receivedAmount,
      inbound.paidAsset,
    );

    const withHandled = await patchPayment(deposited, {
      metadata: markDepositTxHandled(deposited.metadata, txHash),
    });

    try {
      await registerEscrowPaymentOnContract(withHandled);
    } catch (error) {
      if (!isSorobanPaymentAlreadyFinalizedError(error)) {
        throw error;
      }
    }

    const settled = await processEscrowSettlement(withHandled);
    return settled.status === "completed";
  } catch (error) {
    console.error("Failed to relay manual escrow deposit:", error);

    const latest = (await getPaymentByPublicId(activePayment.publicId)) ?? activePayment;

    if (latest.status === "completed") {
      return true;
    }

    if (latest.depositTxHash === txHash) {
      const settled = await processEscrowSettlement(latest);
      if (settled.status === "completed") {
        return true;
      }
    }

    if (isSorobanPaymentAlreadyFinalizedError(error)) {
      const deposited = await recordManualEscrowDeposit(
        activePayment,
        txHash,
        inbound.payerAddress,
        inbound.receivedAmount,
        inbound.paidAsset,
      );
      const withHandled = await patchPayment(deposited, {
        metadata: markDepositTxHandled(deposited.metadata, txHash),
      });
      const settled = await processEscrowSettlement(withHandled);
      return settled.status === "refunded" || settled.status === "completed";
    }

    const refunded = await refundManualEscrowDeposit(
      activePayment,
      txHash,
      inbound.payerAddress,
      inbound.receivedAmount,
      inbound.paidAsset,
      REFUND_REASONS.settle_failed,
    );
    return refunded.status === "refunded";
  }
}

export type EscrowDepositCheckResult = {
  detected: boolean;
  payment: Payment;
};

export async function detectEscrowDepositForPayment(
  payment: Payment,
): Promise<EscrowDepositCheckResult> {
  let fresh = (await getPaymentByPublicId(payment.publicId)) ?? payment;

  if (fresh.status === "completed" || fresh.status === "refunded") {
    return { detected: true, payment: fresh };
  }

  if (fresh.status === "refunding") {
    return { detected: true, payment: fresh };
  }

  if (
    fresh.status === "deposit_received" ||
    fresh.status === "settling" ||
    fresh.status === "settlement_failed"
  ) {
    const updated = await processEscrowSettlement(fresh);
    fresh = (await getPaymentByPublicId(payment.publicId)) ?? updated;
    return {
      detected:
        fresh.status === "completed" ||
        fresh.status === "refunded" ||
        fresh.status === "refunding" ||
        isPaymentInProgressStatus(fresh.status) ||
        fresh.status !== payment.status,
      payment: fresh,
    };
  }

  if (
    fresh.paymentFlow !== "escrow" ||
    !fresh.depositAddress ||
    fresh.status !== "pending"
  ) {
    return { detected: false, payment: fresh };
  }

  const escrow = getEscrowConfig(fresh.environment);
  const server = new Horizon.Server(getHorizonUrl(fresh.environment));
  const paymentsResponse = await server
    .payments()
    .forAccount(escrow.publicKey)
    .order("desc")
    .limit(50)
    .call();

  for (const record of paymentsResponse.records) {
    if (record.type !== "payment") {
      continue;
    }

    const destination =
      "to_muxed" in record && record.to_muxed ? record.to_muxed : record.to;

    if (destination !== fresh.depositAddress) {
      continue;
    }

    if (await relayManualEscrowDeposit(fresh, record.transaction_hash)) {
      const updated = await getPaymentByPublicId(fresh.publicId);
      return { detected: true, payment: updated ?? fresh };
    }
  }

  const updated = await getPaymentByPublicId(fresh.publicId);
  const current = updated ?? fresh;

  if (current.status !== fresh.status) {
    return {
      detected:
        current.status === "completed" ||
        current.status === "refunded" ||
        isPaymentInProgressStatus(current.status),
      payment: current,
    };
  }

  return { detected: false, payment: current };
}

export async function detectEscrowDepositsFromHorizon(
  environment: Payment["environment"]
) {
  const pending = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.environment, environment),
        eq(payments.paymentFlow, "escrow"),
        eq(payments.status, "pending"),
        isNotNull(payments.depositAddress),
      ),
    );

  if (pending.length === 0) {
    return 0;
  }

  const escrow = getEscrowConfig(environment);
  const server = new Horizon.Server(getHorizonUrl(environment));
  const paymentsResponse = await server
    .payments()
    .forAccount(escrow.publicKey)
    .order("desc")
    .limit(200)
    .call();

  const byDestination = new Map(
    pending.map((payment) => [payment.depositAddress!, payment] as const),
  );
  let processed = 0;

  for (const record of paymentsResponse.records) {
    if (record.type !== "payment") {
      continue;
    }

    const destination = "to_muxed" in record && record.to_muxed
      ? record.to_muxed
      : record.to;
    const payment = byDestination.get(destination);

    if (!payment) {
      continue;
    }

    if (await relayManualEscrowDeposit(payment, record.transaction_hash)) {
      processed += 1;
    }
  }

  return processed;
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
