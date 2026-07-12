"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Horizon, TransactionBuilder } from "@stellar/stellar-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckoutPageBackground } from "@/components/checkout/checkout-page-background";
import { CheckoutSandboxBanner } from "@/components/checkout/checkout-sandbox-banner";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import { AlertBlock } from "@/components/shared/alert-block";
import { useStellarWallet } from "@/hooks/use-stellar-wallet";
import { usePaymentQuoteCountdown } from "@/hooks/use-payment-quote-countdown";
import { formatInvoiceAmount } from "@/lib/invoices/amount";
import { formatAmountWithUnit, formatTokenWithAsset } from "@/lib/format/amount";
import type { CheckoutLineItem } from "@/lib/checkout/line-items";
import { getHorizonUrl, getNetworkPassphrase } from "@/lib/stellar/network";
import { formatHorizonSubmitError } from "@/lib/stellar/errors";
import type { Organization } from "@/lib/db/schema";
import { cn } from "@dub/utils";
import { Button, Combobox, type ComboboxOption } from "@dub/ui";
import { Check2 } from "@dub/ui/icons";

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
    payment_flow: "direct" | "soroban";
  };
  items: CheckoutLineItem[];
  merchant: {
    name: string;
    logoUrl: string | null;
    logoInitials: string;
  } | null;
};

function assetKey(asset: AllowedAsset) {
  return `${asset.asset_code}:${asset.issuer_address ?? ""}`;
}

function assetToOption(asset: AllowedAsset): ComboboxOption {
  return {
    value: assetKey(asset),
    label: asset.asset_code,
    meta: asset,
  };
}

function getSourceLabel(sourceType: string | null) {
  switch (sourceType) {
    case "invoice":
      return "Invoice";
    case "payment_link":
      return "Payment link";
    case "checkout_session":
      return "Checkout";
    default:
      return "Payment";
  }
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

function CheckoutLoadingState() {
  return (
    <div className="relative min-h-svh bg-white">
      <div className="relative z-10 flex min-h-svh flex-col">
        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 border-b border-neutral-200/60 bg-neutral-50 px-6 py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-16">
            <div className="mx-auto max-w-md space-y-6">
              <div className="h-12 w-48 animate-pulse rounded-md bg-neutral-200/50" />
              <div className="h-32 animate-pulse rounded-md bg-neutral-200/50" />
            </div>
          </div>
          <div className="relative w-full lg:w-[480px] lg:shrink-0">
            <CheckoutPageBackground />
            <div className="relative z-10 px-6 py-10 lg:px-10 lg:py-16">
              <div className="mx-auto max-w-sm space-y-4">
                <div className="h-10 animate-pulse rounded-md bg-neutral-100/80" />
                <div className="h-10 animate-pulse rounded-md bg-neutral-100/80" />
                <div className="h-11 animate-pulse rounded-md bg-neutral-100/80" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CheckoutClient({ paymentId }: { paymentId: string }) {
  const [data, setData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaidAssetKey, setSelectedPaidAssetKey] = useState("");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(() =>
    getStoredCheckoutTxHash(paymentId),
  );
  const [restoredPaymentId, setRestoredPaymentId] = useState(paymentId);

  if (restoredPaymentId !== paymentId) {
    setRestoredPaymentId(paymentId);
    setPendingTxHash(getStoredCheckoutTxHash(paymentId));
  }

  const environment = data?.payment.environment ?? "sandbox";
  const { address, connect, isConnecting } = useStellarWallet(environment);

  const allowedAssets = data?.payment.allowed_assets ?? [];
  const assetOptions = useMemo(
    () => allowedAssets.map(assetToOption),
    [allowedAssets],
  );

  const selectedPaidAsset = useMemo(() => {
    return (
      allowedAssets.find((asset) => assetKey(asset) === selectedPaidAssetKey) ??
      allowedAssets[0] ??
      null
    );
  }, [allowedAssets, selectedPaidAssetKey]);

  const selectedAssetOption = useMemo(
    () => assetOptions.find((option) => option.value === selectedPaidAssetKey) ?? null,
    [assetOptions, selectedPaidAssetKey],
  );

  const hasPricing = Boolean(
    data?.payment.pricing_currency && data?.payment.pricing_amount,
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
      `/api/checkout/${paymentId}/quote?${params.toString()}`,
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
    (isLoadingQuote || !quote || (quoteExpired && !isRefreshingRate));

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
    ? (quote?.paid_amount ??
      data?.payment.quoted_paid_amount ??
      data?.payment.amount ??
      "0")
    : (data?.payment.amount ?? "0");
  const displayAsset =
    selectedPaidAsset?.asset_code ??
    data?.payment.paid_asset?.asset_code ??
    data?.payment.settlement_asset.asset_code ??
    "XLM";

  async function confirmPayment(txHash: string) {
    const isSoroban = data?.payment.payment_flow === "soroban";
    const confirmResponse = await fetch(`/api/checkout/${paymentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isSoroban
          ? { action: "confirm_soroban", txHash, payerAddress: address }
          : { txHash },
      ),
    });

    const confirmData = (await confirmResponse.json()) as {
      status?: string;
      error?: string;
    };

    if (confirmResponse.status === 202) {
      setPendingTxHash(txHash);
      sessionStorage.setItem(`payoes:checkout-tx:${paymentId}`, txHash);
      setData((current) =>
        current
          ? { ...current, payment: { ...current.payment, status: "processing" } }
          : current,
      );
      return false;
    }

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
        : current,
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
        },
      );

      const submitResult =
        data.payment.payment_flow === "soroban"
          ? await (async () => {
              const response = await fetch(`/api/checkout/${paymentId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "submit_soroban",
                  signedXdr: signedTxXdr,
                }),
              });
              const payload = (await response.json()) as { tx_hash?: string; error?: string };

              if (!response.ok || !payload.tx_hash) {
                throw new Error(payload.error ?? "Unable to submit Soroban payment");
              }

              return { hash: payload.tx_hash };
            })()
          : await (async () => {
              const server = new Horizon.Server(getHorizonUrl(data.payment.environment));
              const transaction = TransactionBuilder.fromXDR(
                signedTxXdr,
                getNetworkPassphrase(data.payment.environment),
              );
              return server.submitTransaction(transaction);
            })();

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

  async function handleSimulatePayment() {
    if (!data || !selectedPaidAsset) {
      return;
    }

    setIsSimulating(true);
    setError(null);

    try {
      const response = await fetch(`/api/checkout/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate_payment",
          paid_asset: selectedPaidAsset,
        }),
      });

      const payload = (await response.json()) as {
        status?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to simulate payment");
        return;
      }

      setData((current) =>
        current
          ? {
              ...current,
              payment: {
                ...current.payment,
                status: payload.status ?? "completed",
              },
            }
          : current,
      );
    } catch {
      setError("Unable to simulate payment");
    } finally {
      setIsSimulating(false);
    }
  }

  if (isLoading) {
    return <CheckoutLoadingState />;
  }

  if (!data) {
    return (
      <div className="relative flex min-h-svh items-center justify-center bg-neutral-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <AlertBlock type="error">{error ?? "Payment not found"}</AlertBlock>
        </div>
      </div>
    );
  }

  const isCompleted = data.payment.status === "completed";
  const isSessionExpired =
    data.payment.status === "expired" || Boolean(data.payment.session_error);
  const settlementLabel = data.payment.settlement_asset.asset_code;
  const isSandbox = data.payment.environment === "sandbox";
  const sourceLabel = getSourceLabel(data.payment.source_type);
  const currencyCode = data.payment.pricing_currency ?? "USD";
  const lineItems = data.items ?? [];

  function formatLineAmount(amount: string) {
    if (hasPricing) {
      return formatAmountWithUnit(amount, currencyCode);
    }

    return formatTokenWithAsset(amount, settlementLabel);
  }

  return (
    <div className="relative min-h-svh bg-white">
      <div className="relative z-10 flex min-h-svh flex-col">
        {isSandbox ? (
          <CheckoutSandboxBanner
            onSimulate={() => void handleSimulatePayment()}
            isSimulating={isSimulating}
            simulateDisabled={isCompleted}
          />
        ) : null}

        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 border-b border-neutral-200/60 bg-neutral-50 px-6 py-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
          <div className="mx-auto max-w-md space-y-8">
            <div className="flex items-center gap-3">
              {data.merchant ? (
                <div className="flex size-10 shrink-0 overflow-hidden rounded-full">
                  <OrganizationMark
                    organization={{
                      name: data.merchant.name,
                      logoUrl: data.merchant.logoUrl,
                      logoInitials: data.merchant.logoInitials,
                    }}
                    className="size-full"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm text-neutral-500">{sourceLabel}</p>
                <p className="truncate text-base font-medium text-neutral-900">
                  {data.merchant?.name ?? "Merchant"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {lineItems.length > 0 ? (
                <div className="space-y-3 border-b border-neutral-200 pb-4">
                  {lineItems.map((item, index) => (
                    <div
                      key={`${item.description}-${index}`}
                      className="flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">
                          {item.description}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {item.quantity} × {formatLineAmount(item.unit_amount)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium text-neutral-900">
                        {formatLineAmount(item.line_amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-b border-neutral-200 pb-4">
                  <p className="text-sm text-neutral-500">
                    {data.payment.description ?? "No line items for this payment."}
                  </p>
                </div>
              )}

              <div className="space-y-2 border-b border-neutral-200 pb-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="font-medium text-neutral-900">
                    {hasPricing
                      ? formatInvoiceAmount(
                          data.payment.pricing_amount!,
                          data.payment.pricing_currency!,
                        )
                      : formatTokenWithAsset(data.payment.amount, settlementLabel)}
                  </span>
                </div>
                {hasPricing ? (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-neutral-500">You pay</span>
                    <span className="font-medium text-neutral-900">
                      {formatTokenWithAsset(displayAmount, displayAsset)}
                    </span>
                  </div>
                ) : null}
                {hasPricing ? (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-neutral-500">Settles in</span>
                    <span className="font-medium text-neutral-900">
                      {settlementLabel}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-neutral-900">Total due</span>
                <div className="text-right">
                  {hasPricing ? (
                    <>
                      <p className="text-lg font-semibold text-neutral-900">
                        {formatInvoiceAmount(
                          data.payment.pricing_amount!,
                          data.payment.pricing_currency!,
                        )}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {formatTokenWithAsset(displayAmount, displayAsset)}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-semibold text-neutral-900">
                      {formatTokenWithAsset(data.payment.amount, settlementLabel)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {quote && hasPricing ? (
              <p
                className={cn(
                  "text-xs text-neutral-500",
                  isRefreshingRate && "animate-pulse",
                )}
              >
                {rateLockLabel}
              </p>
            ) : null}
          </div>
          </div>

          <div className="relative w-full lg:w-[480px] lg:shrink-0">
            <CheckoutPageBackground />
            <div className="relative z-10 px-6 py-8 lg:px-10 lg:py-12">
          <div className="mx-auto max-w-sm space-y-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Payment</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Connect your Stellar wallet and complete the payment.
              </p>
            </div>

            {isCompleted ? (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                <Check2 className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">Payment completed</p>
                  <p className="mt-1 text-emerald-700">
                    Your payment was submitted successfully.
                  </p>
                </div>
              </div>
            ) : isSessionExpired ? (
              <AlertBlock type="error">
                {data.payment.session_error ??
                  "This payment has expired. Ask the merchant to send a new invoice link."}
              </AlertBlock>
            ) : (
              <div className="space-y-5">
                {allowedAssets.length > 1 ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="checkout-pay-with"
                      className="text-sm font-medium text-neutral-900"
                    >
                      Pay with
                    </label>
                    <Combobox
                      selected={selectedAssetOption}
                      setSelected={(option: ComboboxOption | null) => {
                        if (option) {
                          setSelectedPaidAssetKey(option.value);
                        }
                      }}
                      options={assetOptions}
                      placeholder="Select asset"
                      searchPlaceholder="Search assets..."
                      matchTriggerWidth
                      buttonProps={{
                        id: "checkout-pay-with",
                        className: "h-10 w-full justify-between",
                        textWrapperClassName: "min-w-0 flex-1 text-left",
                      }}
                    />
                  </div>
                ) : null}

                {address ? (
                  <div className="space-y-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Connected wallet
                    </p>
                    <p className="break-all font-mono text-xs text-neutral-700">
                      {address}
                    </p>
                  </div>
                ) : null}

                {quoteError && !isRefreshingRate ? (
                  <AlertBlock type="error">{quoteError}</AlertBlock>
                ) : null}
                {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

                {pendingTxHash ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 w-full"
                    text="Retry payment confirmation"
                    loading={isPaying}
                    onClick={() => {
                      setIsPaying(true);
                      void confirmPayment(pendingTxHash).finally(() => {
                        setIsPaying(false);
                      });
                    }}
                  />
                ) : null}

                {!address ? (
                  <Button
                    type="button"
                    className="h-10 w-full"
                    text="Connect wallet"
                    loading={isConnecting}
                    disabled={paymentBlocked}
                    onClick={() => void connect()}
                  />
                ) : (
                  <Button
                    type="button"
                    className="h-10 w-full"
                    text={`Pay ${displayAmount} ${displayAsset}`}
                    loading={isPaying || isRefreshingRate}
                    disabled={paymentBlocked}
                    onClick={() => void handlePay()}
                  />
                )}
              </div>
            )}
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
