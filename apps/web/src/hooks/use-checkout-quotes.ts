"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AllowedAsset,
  PaymentQuote,
} from "@/components/checkout/checkout-types";

function assetKey(asset: AllowedAsset) {
  return `${asset.asset_code}:${asset.issuer_address ?? ""}`;
}

function getQuoteStorageKey(paymentId: string, asset: AllowedAsset) {
  return `payoes:quote:${paymentId}:${asset.asset_code}:${asset.issuer_address ?? ""}`;
}

function isQuoteStillValid(quote: PaymentQuote) {
  return new Date(quote.expires_at).getTime() > Date.now() + 1500;
}

function readQuoteFromStorage(
  paymentId: string,
  asset: AllowedAsset,
): PaymentQuote | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cached = localStorage.getItem(getQuoteStorageKey(paymentId, asset));
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as PaymentQuote;
    return isQuoteStillValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveQuoteToStorage(paymentId: string, quote: PaymentQuote) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      getQuoteStorageKey(paymentId, quote.paid_asset),
      JSON.stringify(quote),
    );
  } catch {
    // ignore
  }
}

type UseCheckoutQuotesOptions = {
  paymentId: string;
  allowedAssets: AllowedAsset[];
  selectedPaidAsset: AllowedAsset | null;
  hasPricing: boolean;
  disabled?: boolean;
};

export function useCheckoutQuotes({
  paymentId,
  allowedAssets,
  selectedPaidAsset,
  hasPricing,
  disabled = false,
}: UseCheckoutQuotesOptions) {
  const [quotesByAssetKey, setQuotesByAssetKey] = useState<
    Record<string, PaymentQuote>
  >({});
  const [quoteErrorsByAssetKey, setQuoteErrorsByAssetKey] = useState<
    Record<string, string>
  >({});
  const [loadingAssetKeys, setLoadingAssetKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const quotesRef = useRef(quotesByAssetKey);
  const inFlightRef = useRef<Set<string>>(new Set());

  quotesRef.current = quotesByAssetKey;

  const markLoading = useCallback((key: string, loading: boolean) => {
    setLoadingAssetKeys((current) => {
      const next = new Set(current);
      if (loading) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const fetchQuoteForAsset = useCallback(
    async (asset: AllowedAsset): Promise<PaymentQuote> => {
      const params = new URLSearchParams({
        paid_asset_code: asset.asset_code,
      });

      if (asset.issuer_address) {
        params.set("paid_asset_issuer", asset.issuer_address);
      }

      const response = await apiFetch(
        `/api/checkout/${paymentId}/quote?${params.toString()}`,
      );
      const quoteData = (await response.json()) as PaymentQuote & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(quoteData.error ?? "Unable to load payment quote");
      }

      return quoteData;
    },
    [paymentId],
  );

  const refreshQuoteForAsset = useCallback(
    async (asset: AllowedAsset, { force = false } = {}) => {
      if (!hasPricing || disabled) {
        return;
      }

      const key = assetKey(asset);

      if (!force) {
        const existing = quotesRef.current[key];
        if (existing && isQuoteStillValid(existing)) {
          return;
        }

        const cachedStorage = readQuoteFromStorage(paymentId, asset);
        if (cachedStorage) {
          setQuotesByAssetKey((current) => ({ ...current, [key]: cachedStorage }));
          setQuoteErrorsByAssetKey((current) => {
            if (!(key in current)) {
              return current;
            }
            const next = { ...current };
            delete next[key];
            return next;
          });
          return;
        }
      }

      if (inFlightRef.current.has(key)) {
        return;
      }

      inFlightRef.current.add(key);
      markLoading(key, true);
      setQuoteErrorsByAssetKey((current) => {
        if (!(key in current)) {
          return current;
        }
        const next = { ...current };
        delete next[key];
        return next;
      });

      try {
        const quoteData = await fetchQuoteForAsset(asset);
        saveQuoteToStorage(paymentId, quoteData);
        setQuotesByAssetKey((current) => ({ ...current, [key]: quoteData }));
      } catch (error) {
        setQuotesByAssetKey((current) => {
          if (!(key in current)) {
            return current;
          }
          const next = { ...current };
          delete next[key];
          return next;
        });
        setQuoteErrorsByAssetKey((current) => ({
          ...current,
          [key]:
            error instanceof Error
              ? error.message
              : "Unable to load payment quote",
        }));
      } finally {
        inFlightRef.current.delete(key);
        markLoading(key, false);
      }
    },
    [disabled, fetchQuoteForAsset, hasPricing, markLoading, paymentId],
  );

  const prefetchAllQuotes = useCallback(async () => {
    if (!hasPricing || allowedAssets.length === 0 || disabled) {
      setQuotesByAssetKey({});
      setQuoteErrorsByAssetKey({});
      setLoadingAssetKeys(new Set());
      return;
    }

    const seeded: Record<string, PaymentQuote> = {};

    for (const asset of allowedAssets) {
      const key = assetKey(asset);
      const cached = readQuoteFromStorage(paymentId, asset);
      if (cached) {
        seeded[key] = cached;
      }
    }

    if (Object.keys(seeded).length > 0) {
      setQuotesByAssetKey((current) => ({ ...current, ...seeded }));
    }

    const assetsToFetch = allowedAssets.filter((asset) => {
      const key = assetKey(asset);
      const existing = quotesRef.current[key] ?? seeded[key];
      return !existing || !isQuoteStillValid(existing);
    });

    if (assetsToFetch.length === 0) {
      return;
    }

    await Promise.all(
      assetsToFetch.map((asset) => refreshQuoteForAsset(asset)),
    );
  }, [allowedAssets, disabled, hasPricing, paymentId, refreshQuoteForAsset]);

  const loadQuote = useCallback(async () => {
    if (!hasPricing || allowedAssets.length === 0 || disabled) {
      return;
    }

    await Promise.all(
      allowedAssets.map((asset) => refreshQuoteForAsset(asset, { force: true })),
    );
  }, [allowedAssets, disabled, hasPricing, refreshQuoteForAsset]);

  useEffect(() => {
    setQuotesByAssetKey({});
    setQuoteErrorsByAssetKey({});
    setLoadingAssetKeys(new Set());
    inFlightRef.current = new Set();
  }, [paymentId]);

  useEffect(() => {
    void prefetchAllQuotes();
  }, [prefetchAllQuotes]);

  useEffect(() => {
    if (!selectedPaidAsset || !hasPricing || disabled) {
      return;
    }

    void refreshQuoteForAsset(selectedPaidAsset);
  }, [disabled, hasPricing, refreshQuoteForAsset, selectedPaidAsset]);

  useEffect(() => {
    if (!disabled) {
      return;
    }

    setQuotesByAssetKey({});
    setQuoteErrorsByAssetKey({});
    setLoadingAssetKeys(new Set());
    inFlightRef.current = new Set();
  }, [disabled]);

  const selectedAssetKey = selectedPaidAsset ? assetKey(selectedPaidAsset) : null;
  const quote = selectedAssetKey
    ? (quotesByAssetKey[selectedAssetKey] ?? null)
    : null;
  const quoteError = selectedAssetKey
    ? (quoteErrorsByAssetKey[selectedAssetKey] ?? null)
    : null;
  const isLoadingQuote = selectedAssetKey
    ? loadingAssetKeys.has(selectedAssetKey)
    : false;

  return {
    quote,
    quoteError,
    isLoadingQuote,
    loadQuote,
  };
}
