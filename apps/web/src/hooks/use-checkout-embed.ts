"use client";

import { useEffect } from "react";
import {
  CHECKOUT_EMBED_EVENTS,
  isCheckoutEmbedCloseMessage,
  postCheckoutEmbedMessage,
} from "@/lib/checkout/embed-messages";

type UseCheckoutEmbedInput = {
  embedded: boolean;
  paymentId: string;
  status: string | null | undefined;
  txHash?: string | null;
  isLoaded: boolean;
};

export function useCheckoutEmbed({
  embedded,
  paymentId,
  status,
  txHash,
  isLoaded,
}: UseCheckoutEmbedInput) {
  useEffect(() => {
    if (!embedded || !isLoaded) {
      return;
    }

    postCheckoutEmbedMessage({
      event: CHECKOUT_EMBED_EVENTS.ready,
      data: { paymentId },
    });
  }, [embedded, isLoaded, paymentId]);

  useEffect(() => {
    if (!embedded || !status) {
      return;
    }

    if (status !== "completed" && status !== "refunded") {
      return;
    }

    postCheckoutEmbedMessage({
      event: CHECKOUT_EMBED_EVENTS.completed,
      data: {
        paymentId,
        status,
        txHash: txHash ?? null,
      },
    });
  }, [embedded, paymentId, status, txHash]);

  useEffect(() => {
    if (!embedded) {
      return;
    }

    function handleMessage(event: MessageEvent) {
      if (!isCheckoutEmbedCloseMessage(event.data)) {
        return;
      }

      postCheckoutEmbedMessage({
        event: CHECKOUT_EMBED_EVENTS.closed,
        data: { paymentId },
      });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [embedded, paymentId]);
}
