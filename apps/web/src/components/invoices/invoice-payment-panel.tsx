"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EnvironmentBadge } from "@/components/shared/environment-badge";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { usePaymentQuoteCountdown } from "@/hooks/use-payment-quote-countdown";
import { useStellarWallet } from "@/hooks/use-stellar-wallet";
import { formatInvoiceAmount } from "@/lib/invoices/amount";
import { formatTokenWithAsset } from "@/lib/format/amount";
import type { Organization } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type AllowedAsset = {
  asset_code: string;
  issuer_address: string | null;
};

type PaymentQuote = {
  pricing_amount: string;
  pricing_currency: string;
  paid_asset: AllowedAsset;
  paid_amount: string;
  settlement_asset?: AllowedAsset;
  settlement_amount?: string;
  rate: string;
  settlement_quote_rate?: string;
  requires_path_payment?: boolean;
  expires_at: string;
};

function assetKey(asset: AllowedAsset) {
  return `${asset.asset_code}:${asset.issuer_address ?? ""}`;
}

export function InvoicePaymentPanel({
  paymentId,
  environment,
  pricingAmount,
  pricingCurrency,
  allowedAssets,
  disabled = false,
}: {
  paymentId: string;
  environment: Organization["environment"];
  pricingAmount: string;
  pricingCurrency: string;
  allowedAssets: AllowedAsset[];
  disabled?: boolean;
}) {
  const [selectedAssetKey, setSelectedAssetKey] = useState("");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const { address, connect, isConnecting } = useStellarWallet(environment);

  const selectedAsset = useMemo(
    () =>
      allowedAssets.find((asset) => assetKey(asset) === selectedAssetKey) ??
      allowedAssets[0] ??
      null,
    [allowedAssets, selectedAssetKey]
  );

  useEffect(() => {
    if (allowedAssets[0]) {
      setSelectedAssetKey(assetKey(allowedAssets[0]));
    }
  }, [allowedAssets]);

  const loadQuote = useCallback(async () => {
    if (!selectedAsset) {
      return;
    }

    setIsLoadingQuote(true);
    setQuoteError(null);

    const params = new URLSearchParams({
      paid_asset_code: selectedAsset.asset_code,
    });

    if (selectedAsset.issuer_address) {
      params.set("paid_asset_issuer", selectedAsset.issuer_address);
    }

    const response = await apiFetch(
      `/api/checkout/${paymentId}/quote?${params.toString()}`
    );
    const data = (await response.json()) as PaymentQuote & { error?: string };

    setIsLoadingQuote(false);

    if (!response.ok) {
      setQuote(null);
      setQuoteError(data.error ?? "Unable to load payment quote");
      return;
    }

    setQuote(data);
  }, [paymentId, selectedAsset]);

  const { quoteExpired, isRefreshingRate, rateLockLabel } =
    usePaymentQuoteCountdown({
      expiresAt: quote?.expires_at,
      disabled,
      isLoadingQuote,
      quoteError,
      loadQuote,
    });

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const paymentBlocked =
    disabled ||
    isLoadingQuote ||
    !quote ||
    (quoteExpired && !isRefreshingRate);

  return (
    <div className="rounded-xl border bg-background p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">Pay invoice</p>
        <EnvironmentBadge environment={environment} />
      </div>

      <div className="mt-4 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">Invoice total</p>
        <p className="mt-1 text-2xl font-semibold">
          {formatInvoiceAmount(pricingAmount, pricingCurrency)}
        </p>
      </div>

      {allowedAssets.length > 1 ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Pay with</p>
          <div className="flex flex-wrap gap-2">
            {allowedAssets.map((asset) => {
              const key = assetKey(asset);
              const isSelected = key === selectedAssetKey;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedAssetKey(key)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {asset.asset_code}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {quote ? (
        <div className="mt-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">You pay approximately</p>
          <p className="mt-1 text-xl font-semibold">
            {formatTokenWithAsset(quote.paid_amount, quote.paid_asset.asset_code)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Rate: 1 {quote.paid_asset.asset_code} ={" "}
            {formatInvoiceAmount(quote.rate, pricingCurrency)}
          </p>
          <p
            className={cn(
              "mt-1 text-xs text-muted-foreground",
              isRefreshingRate && "animate-pulse"
            )}
          >
            {rateLockLabel}
          </p>
        </div>
      ) : null}

      {quoteError && !isRefreshingRate ? (
        <AlertBlock type="error" className="mt-4">
          {quoteError}
        </AlertBlock>
      ) : null}

      {!address ? (
        <Button
          type="button"
          className="mt-4 w-full"
          onClick={() => void connect()}
          isLoading={isConnecting}
          disabled={paymentBlocked}
        >
          Connect wallet
        </Button>
      ) : (
        <Button
          type="button"
          className="mt-4 w-full"
          disabled={paymentBlocked}
          render={
            <a
              href={`/c/${paymentId}?paid_asset=${encodeURIComponent(selectedAsset?.asset_code ?? "")}`}
            />
          }
        >
          Continue to checkout
        </Button>
      )}

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Rates are indicative and refresh automatically when the lock expires.
      </p>
    </div>
  );
}
