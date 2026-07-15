import type { CheckoutCompleteResult } from "./types";

export const CHECKOUT_EMBED_EVENTS = {
  ready: "payoes:checkout:ready",
  completed: "payoes:checkout:completed",
  closed: "payoes:checkout:closed",
  close: "payoes:checkout:close",
} as const;

type EmbedMessage = {
  event: string;
  data?: Record<string, unknown>;
};

export function isTrustedEmbedOrigin(origin: string, baseUrl: string) {
  try {
    const expected = new URL(baseUrl).origin;
    return origin === expected;
  } catch {
    return false;
  }
}

export function parseCheckoutUrl(input: string, baseUrl: string) {
  const url = new URL(input, baseUrl);
  const match = url.pathname.match(/\/c\/([^/]+)/);

  if (!match?.[1]) {
    throw new Error("Invalid checkout URL. Expected /c/{payment_id}.");
  }

  return {
    paymentId: match[1],
    embedUrl: `${url.origin}/c/${match[1]}?embed=1`,
  };
}

export function resolveCheckoutTarget(options: {
  paymentId?: string;
  checkoutUrl?: string;
  baseUrl: string;
}) {
  if (options.checkoutUrl) {
    return parseCheckoutUrl(options.checkoutUrl, options.baseUrl);
  }

  if (options.paymentId) {
    const base = options.baseUrl.replace(/\/$/, "");
    return {
      paymentId: options.paymentId,
      embedUrl: `${base}/c/${options.paymentId}?embed=1`,
    };
  }

  throw new Error("paymentId or checkoutUrl is required.");
}

export function createEmbedMessageListener(input: {
  baseUrl: string;
  onReady?: (paymentId: string) => void;
  onComplete?: (result: CheckoutCompleteResult) => void;
  onClosed?: (paymentId: string) => void;
}) {
  return function handleMessage(event: MessageEvent) {
    if (!isTrustedEmbedOrigin(event.origin, input.baseUrl)) {
      return;
    }

    const message = event.data as EmbedMessage;

    if (!message?.event) {
      return;
    }

    switch (message.event) {
      case CHECKOUT_EMBED_EVENTS.ready: {
        const paymentId = String(message.data?.paymentId ?? "");
        if (paymentId) {
          input.onReady?.(paymentId);
        }
        break;
      }
      case CHECKOUT_EMBED_EVENTS.completed: {
        input.onComplete?.({
          paymentId: String(message.data?.paymentId ?? ""),
          status: String(message.data?.status ?? ""),
          txHash:
            typeof message.data?.txHash === "string"
              ? message.data.txHash
              : null,
        });
        break;
      }
      case CHECKOUT_EMBED_EVENTS.closed: {
        const paymentId = String(message.data?.paymentId ?? "");
        if (paymentId) {
          input.onClosed?.(paymentId);
        }
        break;
      }
      default:
        break;
    }
  };
}

export function postCloseMessage(iframe: HTMLIFrameElement) {
  iframe.contentWindow?.postMessage(
    {
      event: CHECKOUT_EMBED_EVENTS.close,
      data: {},
    },
    "*",
  );
}
