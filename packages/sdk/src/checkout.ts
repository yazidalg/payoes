import { DEFAULT_BASE_URL } from "./constants";
import {
  createEmbedMessageListener,
  postCloseMessage,
  resolveCheckoutTarget,
} from "./messages";
import { createCheckoutModal, type CheckoutModal } from "./modal";
import type { OpenCheckoutOptions } from "./types";

let activeModal: CheckoutModal | null = null;
let activeMessageListener: ((event: MessageEvent) => void) | null = null;
let activeOnClose: (() => void) | null = null;

function removeMessageListener() {
  if (activeMessageListener) {
    window.removeEventListener("message", activeMessageListener);
    activeMessageListener = null;
  }
}

function teardownModal(notifyClose = true) {
  if (activeModal) {
    activeModal.close();
    activeModal = null;
  }

  removeMessageListener();

  if (notifyClose) {
    activeOnClose?.();
    activeOnClose = null;
  } else {
    activeOnClose = null;
  }
}

export function closeCheckout() {
  if (activeModal?.iframe) {
    postCloseMessage(activeModal.iframe);
  }

  teardownModal(true);
}

export function openCheckout(options: OpenCheckoutOptions) {
  if (typeof window === "undefined") {
    throw new Error("Payoes checkout embed can only run in the browser.");
  }

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  activeOnClose = options.onClose ?? null;

  let target;

  try {
    target = resolveCheckoutTarget({
      paymentId: options.paymentId,
      checkoutUrl: options.checkoutUrl,
      baseUrl,
    });
  } catch (error) {
    options.onError?.(
      error instanceof Error ? error : new Error("Invalid checkout options."),
    );
    throw error;
  }

  teardownModal(false);

  const modal = createCheckoutModal(target.embedUrl, () => {
    if (activeModal?.iframe) {
      postCloseMessage(activeModal.iframe);
    }
    teardownModal(true);
  });

  activeModal = modal;

  const handleMessage = createEmbedMessageListener({
    baseUrl,
    onComplete: (result) => {
      options.onComplete?.(result);
      if (result.status === "completed" || result.status === "refunded") {
        teardownModal(true);
      }
    },
    onClosed: () => {
      teardownModal(true);
    },
  });

  activeMessageListener = (event: MessageEvent) => {
    try {
      handleMessage(event);
    } catch (error) {
      options.onError?.(
        error instanceof Error
          ? error
          : new Error("Checkout embed message failed."),
      );
    }
  };

  window.addEventListener("message", activeMessageListener);
}
