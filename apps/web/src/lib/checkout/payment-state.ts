export const CHECKOUT_PROCESSING_STATUSES = [
  "processing",
  "deposit_received",
  "refunding",
  "settling",
] as const;

export type CheckoutProcessingStatus =
  (typeof CHECKOUT_PROCESSING_STATUSES)[number];

export function isCheckoutProcessingStatus(
  status: string,
): status is CheckoutProcessingStatus {
  return (CHECKOUT_PROCESSING_STATUSES as readonly string[]).includes(status);
}

export function isCheckoutSessionExpired(payment: {
  status: string;
  session_error?: string | null;
}) {
  if (payment.status === "completed") {
    return false;
  }

  if (payment.status === "expired") {
    return true;
  }

  return Boolean(payment.session_error);
}

export function getCheckoutPaymentSubtitle(input: {
  isDetailsPanel: boolean;
  isProcessing: boolean;
  isSessionExpired: boolean;
  hasLastAttemptError: boolean;
  paymentWaitingVariant?:
    | "paying"
    | "confirming"
    | "processing"
    | "checking"
    | null;
}) {
  if (input.isDetailsPanel) {
    return "Enter your information before continuing to payment.";
  }

  switch (input.paymentWaitingVariant) {
    case "paying":
      return "Submitting your payment.";
    case "confirming":
      return "Waiting for on-chain confirmation.";
    case "checking":
      return "Checking for your transfer.";
    case "processing":
      return "Your payment was detected and is being processed.";
    default:
      break;
  }

  if (input.isProcessing) {
    return "Your payment was detected and is being processed.";
  }

  if (input.isSessionExpired) {
    return "This payment can no longer be completed.";
  }

  if (input.hasLastAttemptError) {
    return "Review the message below and try again.";
  }

  return "Connect your Stellar wallet and complete the payment.";
}
