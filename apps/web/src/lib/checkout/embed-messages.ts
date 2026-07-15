export const CHECKOUT_EMBED_EVENTS = {
  ready: "payoes:checkout:ready",
  completed: "payoes:checkout:completed",
  closed: "payoes:checkout:closed",
  close: "payoes:checkout:close",
} as const;

export type CheckoutEmbedEvent =
  (typeof CHECKOUT_EMBED_EVENTS)[keyof typeof CHECKOUT_EMBED_EVENTS];

export type CheckoutEmbedReadyPayload = {
  paymentId: string;
};

export type CheckoutEmbedCompletedPayload = {
  paymentId: string;
  status: string;
  txHash?: string | null;
};

export type CheckoutEmbedClosedPayload = {
  paymentId: string;
};

export type CheckoutEmbedMessage =
  | {
      event: typeof CHECKOUT_EMBED_EVENTS.ready;
      data: CheckoutEmbedReadyPayload;
    }
  | {
      event: typeof CHECKOUT_EMBED_EVENTS.completed;
      data: CheckoutEmbedCompletedPayload;
    }
  | {
      event: typeof CHECKOUT_EMBED_EVENTS.closed;
      data: CheckoutEmbedClosedPayload;
    }
  | {
      event: typeof CHECKOUT_EMBED_EVENTS.close;
      data: Record<string, never>;
    };

export function postCheckoutEmbedMessage(message: CheckoutEmbedMessage) {
  if (typeof window === "undefined" || window.parent === window) {
    return;
  }

  window.parent.postMessage(message, "*");
}

export function isCheckoutEmbedCloseMessage(
  data: unknown,
): data is CheckoutEmbedMessage & { event: typeof CHECKOUT_EMBED_EVENTS.close } {
  if (!data || typeof data !== "object") {
    return false;
  }

  return (
    "event" in data &&
    (data as { event?: string }).event === CHECKOUT_EMBED_EVENTS.close
  );
}
