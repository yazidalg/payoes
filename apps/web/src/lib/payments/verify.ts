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
import { verifyPaymentOnHorizon } from "@/lib/stellar/payments";

async function resolveCustomerForCompletedPayment(
  payment: Payment,
  payerAddress: string
) {
  if (payment.customerId) {
    const customer = await getCustomerById(
      payment.customerId,
      payment.organizationId
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
  const payment = await getPaymentByPublicId(publicId);

  if (!payment) {
    return { ok: false as const, error: "Payment not found" };
  }

  if (payment.status === "completed") {
    return { ok: true as const, payment };
  }

  if (payment.status !== "pending" && payment.status !== "failed") {
    return { ok: false as const, error: `Payment is ${payment.status}` };
  }

  if (payment.expiresAt && payment.expiresAt < new Date()) {
    await updatePaymentStatus(payment, "expired");
    return { ok: false as const, error: "Payment has expired" };
  }

  try {
    const verification = await verifyPaymentOnHorizon({
      txHash,
      destination: payment.receivingAddress,
      amount: payment.amount,
      asset: payment.asset,
      environment: payment.environment,
      memo: payment.memo,
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
    });

    return { ok: true as const, payment: updated };
  } catch {
    return { ok: false as const, error: "Unable to verify transaction" };
  }
}

export function isPaymentExpired(payment: Payment) {
  return Boolean(payment.expiresAt && payment.expiresAt < new Date());
}
