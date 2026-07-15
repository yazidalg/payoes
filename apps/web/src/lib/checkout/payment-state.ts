import {
  getInvoiceCheckoutSessionExpiredMessage,
  getInvoiceCheckoutSessionExpiredSubtitle,
} from "@/lib/invoices/status";

export function getCheckoutSessionExpiredSubtitle(input: {
  invoice?: { due_at?: string | null } | null;
}) {
  if (input.invoice) {
    return getInvoiceCheckoutSessionExpiredSubtitle(input.invoice);
  }

  return "This checkout session has expired.";
}

export function getCheckoutSessionExpiredMessage(input: {
  invoice?: { due_at?: string | null } | null;
}) {
  if (input.invoice) {
    return getInvoiceCheckoutSessionExpiredMessage(input.invoice);
  }

  return "This checkout session has expired. Ask the merchant to send a new payment link.";
}

export const PAYMENT_IN_PROGRESS_STATUSES = [
  "deposit_received",
  "refunding",
  "settling",
] as const;

export type PaymentInProgressStatus =
  (typeof PAYMENT_IN_PROGRESS_STATUSES)[number];

export function isPaymentInProgressStatus(
  status: string,
): status is PaymentInProgressStatus {
  return (PAYMENT_IN_PROGRESS_STATUSES as readonly string[]).includes(status);
}

export const CHECKOUT_PROCESSING_STATUSES = [
  "processing",
  ...PAYMENT_IN_PROGRESS_STATUSES,
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
  invoice?: { due_at?: string | null } | null;
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
    return getCheckoutSessionExpiredSubtitle({ invoice: input.invoice });
  }

  if (input.hasLastAttemptError) {
    return "Review the message below and try again.";
  }

  return "Connect your Stellar wallet and complete the payment.";
}
