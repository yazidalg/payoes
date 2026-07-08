"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Horizon, TransactionBuilder } from "@stellar/stellar-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import { EnvironmentBadge } from "@/components/shared/environment-badge";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { useStellarWallet } from "@/hooks/use-stellar-wallet";
import { usePaymentQuoteCountdown } from "@/hooks/use-payment-quote-countdown";
import { formatInvoiceAmount } from "@/lib/invoices/amount";
import { formatTokenWithAsset } from "@/lib/format/amount";
import { getHorizonUrl, getNetworkPassphrase } from "@/lib/stellar/network";
import { formatHorizonSubmitError } from "@/lib/stellar/errors";
import type { Organization } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon } from "lucide-react";

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

type CheckoutData = {
  payment: {
    id: string;
    amount: string;
    settlement_asset: AllowedAsset;
    allowed_assets: AllowedAsset[];
    paid_asset: AllowedAsset | null;
    status: string;
    session_error?: string | null;
    description: string | null;
    environment: Organization["environment"];
    expires_at: string | null;
    quote_expires_at: string | null;
    pricing_currency: string | null;
    pricing_amount: string | null;
    quoted_paid_amount: string | null;
    quoted_settlement_amount: string | null;
    quote_rate: string | null;
    settlement_quote_rate: string | null;
    source_type: string | null;
  };
  merchant: {
    name: string;
    logoUrl: string | null;
    logoInitials: string;
  } | null;
};

function assetKey(asset: AllowedAsset) {
  return `${asset.asset_code}:${asset.issuer_address ?? ""}`;
}

function getStoredCheckoutTxHash(paymentId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(`payoes:checkout-tx:${paymentId}`);
}

function getInitialPaidAssetKey(allowedAssets: AllowedAsset[]) {
  if (typeof window === "undefined" || allowedAssets.length === 0) {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  const paidAssetCode = params.get("paid_asset");

  if (paidAssetCode) {
    const match = allowedAssets.find((asset) => asset.asset_code === paidAssetCode);

    if (match) {
      return assetKey(match);
    }
  }

  return assetKey(allowedAssets[0]!);
}

export function CheckoutClient({ paymentId }: { paymentId: string }) {
  const [data, setData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaidAssetKey, setSelectedPaidAssetKey] = useState("");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(() =>
    getStoredCheckoutTxHash(paymentId)
  );
  const [restoredPaymentId, setRestoredPaymentId] = useState(paymentId);

  if (restoredPaymentId !== paymentId) {
    setRestoredPaymentId(paymentId);
    setPendingTxHash(getStoredCheckoutTxHash(paymentId));
  }

  const environment = data?.payment.environment ?? "sandbox";
  const { address, connect, isConnecting } =
    useStellarWallet(environment);

  const allowedAssets = data?.payment.allowed_assets ?? [];
  const selectedPaidAsset = useMemo(() => {
    return (
      allowedAssets.find((asset) => assetKey(asset) === selectedPaidAssetKey) ??
      allowedAssets[0] ??
      null
    );
  }, [allowedAssets, selectedPaidAssetKey]);

  const hasPricing = Boolean(
    data?.payment.pricing_currency && data?.payment.pricing_amount
  );

  const loadQuote = useCallback(async () => {
    if (!selectedPaidAsset || !hasPricing) {
      setQuote(null);
      return;
    }

    setIsLoadingQuote(true);
    setQuoteError(null);

    const params = new URLSearchParams({
      paid_asset_code: selectedPaidAsset.asset_code,
    });

    if (selectedPaidAsset.issuer_address) {
      params.set("paid_asset_issuer", selectedPaidAsset.issuer_address);
    }

    const response = await fetch(
      `/api/checkout/${paymentId}/quote?${params.toString()}`
    );
    const quoteData = (await response.json()) as PaymentQuote & {
      error?: string;
    };

    setIsLoadingQuote(false);

    if (!response.ok) {
      setQuote(null);
      setQuoteError(quoteData.error ?? "Unable to load payment quote");
      return;
    }

    setQuote(quoteData);
  }, [hasPricing, paymentId, selectedPaidAsset]);

  const { quoteExpired, isRefreshingRate, rateLockLabel } =
    usePaymentQuoteCountdown({
      expiresAt: hasPricing ? quote?.expires_at : null,
      isLoadingQuote,
      quoteError,
      loadQuote,
    });

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const paymentBlocked =
    hasPricing &&
    (isLoadingQuote ||
      !quote ||
      (quoteExpired && !isRefreshingRate));

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/checkout/${paymentId}`);
      const json = (await response.json()) as CheckoutData & { error?: string };

      if (!response.ok) {
        setError(json.error ?? "Payment not found");
        setIsLoading(false);
        return;
      }

      setData(json);
      const firstAsset = json.payment.allowed_assets[0];
      if (firstAsset) {
        setSelectedPaidAssetKey(getInitialPaidAssetKey(json.payment.allowed_assets));
      }
      setIsLoading(false);
    }

    void load();
  }, [paymentId]);

  const displayAmount = hasPricing
    ? (quote?.paid_amount ?? data?.payment.quoted_paid_amount ?? data?.payment.amount ?? "0")
    : (data?.payment.amount ?? "0");
  const displayAsset =
    selectedPaidAsset?.asset_code ??
    data?.payment.paid_asset?.asset_code ??
    data?.payment.settlement_asset.asset_code ??
    "XLM";

  async function confirmPayment(txHash: string) {
    const confirmResponse = await fetch(`/api/checkout/${paymentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });

    const confirmData = (await confirmResponse.json()) as {
      status?: string;
      error?: string;
    };

    if (!confirmResponse.ok) {
      setPendingTxHash(txHash);
      sessionStorage.setItem(`payoes:checkout-tx:${paymentId}`, txHash);
      setError(confirmData.error ?? "Payment verification failed");
      return false;
    }

    setPendingTxHash(null);
    sessionStorage.removeItem(`payoes:checkout-tx:${paymentId}`);
    setData((current) =>
      current
        ? {
            ...current,
            payment: {
              ...current.payment,
              status: confirmData.status ?? "completed",
            },
          }
        : current
    );

    return true;
  }

  async function handlePay() {
    if (!data || !address || !selectedPaidAsset) {
      return;
    }

    if (paymentBlocked) {
      if (isRefreshingRate) {
        setError("Rate is refreshing. Please wait a moment and try again.");
      } else {
        setError("Payment quote is unavailable. A new rate will load automatically.");
      }
      return;
    }

    setIsPaying(true);
    setError(null);

    try {
      const buildResponse = await fetch(`/api/checkout/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "build_transaction",
          sourcePublicKey: address,
          paid_asset: selectedPaidAsset,
        }),
      });

      const buildData = (await buildResponse.json()) as {
        xdr?: string;
        error?: string;
      };

      if (!buildResponse.ok || !buildData.xdr) {
        setError(buildData.error ?? "Unable to build transaction");
        setIsPaying(false);
        return;
      }

      const { signedTxXdr } = await StellarWalletsKit.signTransaction(
        buildData.xdr,
        {
          networkPassphrase: getNetworkPassphrase(data.payment.environment),
          address,
        }
      );

      const server = new Horizon.Server(getHorizonUrl(data.payment.environment));
      const transaction = TransactionBuilder.fromXDR(
        signedTxXdr,
        getNetworkPassphrase(data.payment.environment)
      );
      const submitResult = await server.submitTransaction(transaction);

      const confirmed = await confirmPayment(submitResult.hash);
      if (!confirmed) {
        setIsPaying(false);
        return;
      }
    } catch (payError) {
      setError(formatHorizonSubmitError(payError));
    } finally {
      setIsPaying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading checkout...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <AlertBlock type="error">{error ?? "Payment not found"}</AlertBlock>
      </div>
    );
  }

  const isCompleted = data.payment.status === "completed";
  const isSessionExpired =
    data.payment.status === "expired" || Boolean(data.payment.session_error);
  const settlementLabel = data.payment.settlement_asset.asset_code;

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {data.merchant ? (
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-muted">
                <OrganizationMark
                  organization={{
                    name: data.merchant.name,
                    logoUrl: data.merchant.logoUrl,
                    logoInitials: data.merchant.logoInitials,
                  }}
                  className="size-full object-cover"
                />
              </div>
            ) : null}
            <div>
              <p className="text-sm text-muted-foreground">Pay</p>
              <p className="text-lg font-semibold">{data.merchant?.name ?? "Merchant"}</p>
            </div>
          </div>
          <EnvironmentBadge environment={data.payment.environment} />
        </div>

        <div className="mt-6 rounded-xl bg-muted/40 p-4">
          {hasPricing ? (
            <>
              <p className="text-sm text-muted-foreground">Invoice total</p>
              <p className="text-2xl font-bold tracking-tight">
                {formatInvoiceAmount(
                  data.payment.pricing_amount!,
                  data.payment.pricing_currency!
                )}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">You pay approximately</p>
              <p className="text-xl font-semibold">
                {formatTokenWithAsset(displayAmount, displayAsset)}
              </p>
              {quote ? (
                <p
                  className={cn(
                    "mt-2 text-xs text-muted-foreground",
                    isRefreshingRate && "animate-pulse"
                  )}
                >
                  {rateLockLabel}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-3xl font-bold tracking-tight">
                {formatTokenWithAsset(data.payment.amount, settlementLabel)}
              </p>
            </>
          )}
          {data.payment.description ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {data.payment.description}
            </p>
          ) : null}
        </div>

        {isCompleted ? (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2Icon className="size-5" />
            Payment completed successfully.
          </div>
        ) : isSessionExpired ? (
          <AlertBlock type="error" className="mt-6">
            {data.payment.session_error ??
              "This payment has expired. Ask the merchant to send a new invoice link."}
          </AlertBlock>
        ) : (
          <div className="mt-6 space-y-3">
            {allowedAssets.length > 1 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Pay with</p>
                <div className="flex flex-wrap gap-2">
                  {allowedAssets.map((asset) => {
                    const key = assetKey(asset);
                    const isSelected = key === selectedPaidAssetKey;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedPaidAssetKey(key)}
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

            {quoteError && !isRefreshingRate ? (
              <AlertBlock type="error">{quoteError}</AlertBlock>
            ) : null}
            {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

            {pendingTxHash ? (
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={() => {
                  setIsPaying(true);
                  void confirmPayment(pendingTxHash).finally(() => {
                    setIsPaying(false);
                  });
                }}
                isLoading={isPaying}
              >
                Retry payment confirmation
              </Button>
            ) : null}
            {!address ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => void connect()}
                isLoading={isConnecting}
                disabled={paymentBlocked}
              >
                Connect wallet
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={() => void handlePay()}
                isLoading={isPaying || isRefreshingRate}
                disabled={paymentBlocked}
              >
                Pay {displayAmount} {displayAsset}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
