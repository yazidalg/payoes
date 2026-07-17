import { cn } from "@dub/utils";

type CheckoutPaymentSpinnerProps = {
  className?: string;
  size?: "sm" | "md";
};

const spinnerSizeClasses = {
  sm: "size-4",
  md: "size-5",
} as const;

export function CheckoutPaymentSpinner({
  className,
  size = "sm",
}: CheckoutPaymentSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "shrink-0 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700",
        spinnerSizeClasses[size],
        className,
      )}
    />
  );
}

export type CheckoutPaymentWaitingVariant =
  | "paying"
  | "confirming"
  | "processing"
  | "checking";

const waitingCopy: Record<
  CheckoutPaymentWaitingVariant,
  { title: string; description: string }
> = {
  paying: {
    title: "Submitting payment",
    description:
      "Please confirm the transaction in your wallet if prompted.",
  },
  confirming: {
    title: "Confirming payment",
    description:
      "Waiting for on-chain confirmation. This page will update automatically.",
  },
  processing: {
    title: "Processing payment",
    description:
      "Your payment was detected and is being processed. This page will update automatically.",
  },
  checking: {
    title: "Checking payment",
    description: "Looking for your transfer on the network. This may take a moment.",
  },
};

export function CheckoutPaymentWaitingBanner({
  variant,
}: {
  variant: CheckoutPaymentWaitingVariant;
}) {
  const copy = waitingCopy[variant];

  return (
    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800">
      <CheckoutPaymentSpinner className="mt-0.5" />
      <div>
        <p className="font-medium">{copy.title}</p>
        <p className="mt-1 text-blue-700">{copy.description}</p>
      </div>
    </div>
  );
}

export function getCheckoutPaymentWaitingVariant(input: {
  isProcessing: boolean;
  isPaying: boolean;
  isConfirming: boolean;
}): CheckoutPaymentWaitingVariant | null {
  if (input.isProcessing) {
    return "processing";
  }

  if (input.isPaying) {
    return "paying";
  }

  if (input.isConfirming) {
    return "confirming";
  }

  return null;
}
