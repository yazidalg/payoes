import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments, type Payment } from "@/lib/db/schema";
import {
  REFUND_REASONS,
  type RefundReason,
} from "@/lib/payments/settlement/constants";

const RETRYABLE_STATUSES = new Set<Payment["status"]>(["refunded"]);

export function isRetryableFailedPayment(payment: Payment) {
  return RETRYABLE_STATUSES.has(payment.status);
}

export function formatRefundReasonForCheckout(reason: string | null | undefined) {
  switch (reason as RefundReason | undefined) {
    case REFUND_REASONS.underpay:
      return "The amount received was less than required. Your funds were refunded.";
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
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id))
    .returning();

  return updated ?? payment;
}
