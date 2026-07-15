import type { Payment } from "@/lib/db/schema";

const HANDLED_DEPOSIT_TX_HASHES_KEY = "handled_deposit_tx_hashes";

export function getHandledDepositTxHashes(
  metadata: Payment["metadata"]
): string[] {
  const raw = metadata?.[HANDLED_DEPOSIT_TX_HASHES_KEY];
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function isDepositTxAlreadyHandled(
  payment: Payment,
  txHash: string
): boolean {
  if (!txHash) {
    return false;
  }

  if (payment.depositTxHash === txHash && payment.refundTxHash) {
    return true;
  }

  return getHandledDepositTxHashes(payment.metadata).includes(txHash);
}

export function markDepositTxHandled(
  metadata: Payment["metadata"],
  txHash: string
): Record<string, string> {
  if (!txHash) {
    return metadata ?? {};
  }

  const handled = getHandledDepositTxHashes(metadata);
  if (handled.includes(txHash)) {
    return metadata ?? {};
  }

  return {
    ...(metadata ?? {}),
    [HANDLED_DEPOSIT_TX_HASHES_KEY]: JSON.stringify([...handled, txHash]),
  };
}

export function isEscrowRefundTerminal(payment: Payment): boolean {
  return payment.status === "refunded" || Boolean(payment.refundTxHash);
}
