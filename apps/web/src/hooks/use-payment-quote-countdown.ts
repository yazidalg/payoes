"use client";

import { useEffect, useState } from "react";

function formatCountdown(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();

  if (remainingMs <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type UsePaymentQuoteCountdownOptions = {
  expiresAt: string | null | undefined;
  disabled?: boolean;
  isLoadingQuote: boolean;
  quoteError: string | null;
  loadQuote: () => Promise<void>;
};

export function usePaymentQuoteCountdown({
  expiresAt,
  disabled = false,
  isLoadingQuote,
  quoteError,
  loadQuote,
}: UsePaymentQuoteCountdownOptions) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!expiresAt || disabled) {
      return;
    }

    const expiresAtMs = new Date(expiresAt).getTime();

    const refreshTimer = window.setTimeout(
      () => {
        void loadQuote();
      },
      Math.max(expiresAtMs - Date.now(), 0) + 50
    );

    const countdownTimer = window.setInterval(() => {
      setCountdown(formatCountdown(expiresAt));
    }, 1000);

    setCountdown(formatCountdown(expiresAt));

    return () => {
      window.clearTimeout(refreshTimer);
      window.clearInterval(countdownTimer);
    };
  }, [disabled, expiresAt, loadQuote]);

  useEffect(() => {
    if (!quoteError || disabled || isLoadingQuote) {
      return;
    }

    const retryTimer = window.setTimeout(() => {
      void loadQuote();
    }, 3000);

    return () => window.clearTimeout(retryTimer);
  }, [disabled, isLoadingQuote, loadQuote, quoteError]);

  const quoteExpired = expiresAt ? countdown === "Expired" : false;
  const isRefreshingRate = isLoadingQuote && (quoteExpired || Boolean(quoteError));

  const rateLockLabel = isRefreshingRate
    ? "Refreshing rate..."
    : quoteExpired
      ? "Updating rate..."
      : `Rate locked for ${countdown}`;

  return {
    countdown,
    quoteExpired,
    isRefreshingRate,
    rateLockLabel,
  };
}
