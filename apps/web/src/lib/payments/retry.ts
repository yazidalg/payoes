import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments, type Payment } from "@/lib/db/schema";
import { markDepositTxHandled } from "@/lib/payments/settlement/deposit-tracking";
import {
  REFUND_REASONS,
  type RefundReason,
} from "@/lib/payments/settlement/constants";

const RETRYABLE_STATUSES = new Set<Payment["status"]>(["refunded"]);

const NON_RETRYABLE_REFUND_REASONS = new Set<RefundReason>([
  REFUND_REASONS.expired,
]);

export function isRetryableFailedPayment(payment: Payment) {
  if (RETRYABLE_STATUSES.has(payment.status)) {
    return !(
      payment.refundReason &&
      NON_RETRYABLE_REFUND_REASONS.has(payment.refundReason as RefundReason)
    );
  }

  if (payment.status === "settlement_failed" && !payment.settlementTxHash) {
    return Boolean(payment.refundReason);
  }

  return false;
}

export function formatRefundReasonForCheckout(reason: string | null | undefined) {
  switch (reason as RefundReason | undefined) {
    case REFUND_REASONS.underpay:
      return "The amount received was less than required. Your funds were refunded. You can pay again.";
    case REFUND_REASONS.wrong_asset:
      return "The payment was sent in an unsupported asset. Your funds were refunded.";
    case REFUND_REASONS.expired:
      return "The payment session expired before settlement. Your funds were refunded.";
    case REFUND_REASONS.quote_expired:
      return "The rate lock expired before settlement. Your funds were refunded.";
    case REFUND_REASONS.no_liquidity:
      return "Settlement could not be completed due to insufficient liquidity. Your funds were refunded.";
    case REFUND_REASONS.slippage_exceeded:
      return "Settlement could not be completed due to price movement. Your funds were refunded.";
    case REFUND_REASONS.settle_failed:
      return "Settlement could not be completed. Your funds were refunded.";
    default:
      return "The previous payment attempt was refunded. You can try again.";
  }
}

export async function resetPaymentForRetry(payment: Payment) {
  const metadata = payment.depositTxHash
    ? markDepositTxHandled(payment.metadata, payment.depositTxHash)
    : payment.metadata;

  const [updated] = await db
    .update(payments)
    .set({
      status: "pending",
      depositTxHash: null,
      refundTxHash: null,
      refundReason: null,
      receivedAmount: null,
      settlementTxHash: null,
      txHash: null,
      payerAddress: null,
      metadata,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id))
    .returning();

  return updated ?? payment;
}
