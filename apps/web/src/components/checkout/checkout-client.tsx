"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Horizon, TransactionBuilder } from "@stellar/stellar-sdk";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
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
import { Button, Combobox, type ComboboxOption, CopyButton } from "@dub/ui";
import { Check2 } from "@dub/ui/icons";
import { getAssetIconUrl } from "@/lib/assets/icons";
import { getOfficialAsset } from "@/lib/payment-methods/official-assets";

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
    receiving_address: string;
    memo: string | null;
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

function AssetIcon({ code, className }: { code: string; className?: string }) {
  const iconUrl = getAssetIconUrl(code);

  if (iconUrl) {
    return (
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-50 border border-neutral-200/50 p-1.5 overflow-hidden", className)}>
        <img
          src={iconUrl}
          alt={code}
          className="size-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 font-bold text-xs uppercase", className)}>
      {code.slice(0, 3)}
    </div>
  );
}

function getAssetDetails(asset: AllowedAsset) {
  const code = asset.asset_code;
  const official = getOfficialAsset(code);

  if (official) {
    return {
      name: official.displayName,
      description: official.description,
    };
  }

  return {
    name: code,
    description: asset.issuer_address
      ? `Issued by ${asset.issuer_address.slice(0, 4)}...${asset.issuer_address.slice(-4)}`
      : "Custom token",
  };
}

export function CheckoutClient({ paymentId }: { paymentId: string }) {
  const [data, setData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMode, setPaymentMode] = useState<"wallet" | "qr">("wallet");
  const [selectedPaidAssetKey, setSelectedPaidAssetKey] = useState("");
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [isMobileItemsOpen, setIsMobileItemsOpen] = useState(false);
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(() =>
    getStoredCheckoutTxHash(paymentId),
  );
  const [restoredPaymentId, setRestoredPaymentId] = useState(paymentId);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAssetDropdownOpen(false);
      }
    }
    if (isAssetDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isAssetDropdownOpen]);

  if (restoredPaymentId !== paymentId) {
    setRestoredPaymentId(paymentId);
    setPendingTxHash(getStoredCheckoutTxHash(paymentId));
  }

  const environment = data?.payment.environment ?? "sandbox";
  const { address, connect, isConnecting, networkError, connectError } = useStellarWallet(environment);

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

  useEffect(() => {
    const isPayCompleted = data?.payment.status === "completed";
    const isPayExpired = data?.payment.status === "expired" || Boolean(data?.payment.session_error);

    if (isPayCompleted || isPayExpired || !data?.payment.receiving_address || !data?.payment.memo) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const statusResponse = await fetch(`/api/checkout/${paymentId}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json() as CheckoutData;
          if (statusData.payment.status === "completed") {
            setData(statusData);
            clearInterval(interval);
            return;
          }
        }

        const horizonUrl = getHorizonUrl(data.payment.environment);
        const server = new Horizon.Server(horizonUrl);
        const response = await server
          .transactions()
          .forAccount(data.payment.receiving_address)
          .order("desc")
          .limit(10)
          .call();

        for (const tx of response.records) {
          if (tx.memo === data.payment.memo && tx.successful) {
            const verified = await confirmPayment(tx.hash);
            if (verified) {
              clearInterval(interval);
              break;
            }
          }
        }
      } catch (err) {
        console.error("Auto-detect polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [data?.payment.receiving_address, data?.payment.memo, data?.payment.status, data?.payment.session_error, paymentId]);

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

    const confirmData = (await confirmResponse.json().catch(() => ({}))) as {
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
          <div className="flex-none lg:flex-1 border-b border-neutral-200/60 bg-neutral-50 px-4 py-4 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
          <div className="mx-auto max-w-md space-y-4 lg:space-y-8">
            <div className="flex items-center justify-between lg:block lg:space-y-0">
              <div className="flex items-center gap-3">
                {data.merchant ? (
                  <div className="flex size-8 lg:size-10 shrink-0 overflow-hidden rounded-full">
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
                  <p className="hidden lg:block truncate text-sm text-neutral-500">{sourceLabel}</p>
                  <p className="truncate text-sm lg:text-base font-medium text-neutral-900">
                    {data.merchant?.name ?? "Merchant"}
                  </p>
                </div>
              </div>
              
              {/* Mobile Total (Inline) */}
              <div className="lg:hidden text-right">
                <p className="text-xs text-neutral-500">Total</p>
                <p className="text-sm font-semibold text-neutral-900">
                  {hasPricing ? (
                    isLoadingQuote ? (
                      <span className="inline-block h-4 w-16 animate-pulse rounded bg-neutral-200" />
                    ) : (
                      formatTokenWithAsset(displayAmount, displayAsset)
                    )
                  ) : (
                    formatTokenWithAsset(data.payment.amount, settlementLabel)
                  )}
                </p>
              </div>
            </div>

            {/* Mobile Compact Line Items */}
            <div className="lg:hidden">
              {lineItems.length > 0 && (
                <div className="border-t border-neutral-200/60 pt-3 mt-3">
                  <button
                    onClick={() => setIsMobileItemsOpen(!isMobileItemsOpen)}
                    className="flex w-full cursor-pointer list-none items-center justify-between text-xs font-medium text-neutral-500 hover:text-neutral-700"
                  >
                    <span>Show order details</span>
                    <svg className={cn("size-4 transition-transform", isMobileItemsOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <AnimatePresence initial={false}>
                    {isMobileItemsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-1.5 pb-1">
                          {lineItems.map((item, index) => (
                            <div key={index} className="flex justify-between text-xs text-neutral-600">
                              <span className="truncate pr-2">{item.quantity} × {item.description}</span>
                              <span className="shrink-0">{formatLineAmount(item.line_amount)}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="hidden lg:block space-y-4">
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
                      {isLoadingQuote ? (
                        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
                      ) : (
                        formatTokenWithAsset(displayAmount, displayAsset)
                      )}
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
                      <div className="text-sm text-neutral-500 flex justify-end">
                        {isLoadingQuote ? (
                          <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
                        ) : (
                          formatTokenWithAsset(displayAmount, displayAsset)
                        )}
                      </div>
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

          <div className="relative flex-none lg:flex-1">
            <CheckoutPageBackground />
            <div className="relative z-10 px-6 py-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-md space-y-6">
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
                  <div ref={dropdownRef} className="relative space-y-2.5">
                    <label className="text-sm font-medium text-neutral-900">
                      Pay with
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                      className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5 text-left shadow-sm transition-all hover:bg-neutral-50 active:scale-[0.99]"
                    >
                      {selectedPaidAsset && (
                        <div className="flex items-center gap-3">
                          <AssetIcon code={selectedPaidAsset.asset_code} />
                          <div>
                            <p className="font-semibold text-neutral-900 text-sm">
                              {getAssetDetails(selectedPaidAsset).name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {getAssetDetails(selectedPaidAsset).description}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {hasPricing && (
                          isLoadingQuote ? (
                            <div className="h-4 w-16 animate-pulse rounded bg-neutral-200 mr-1" />
                          ) : quote ? (
                            <span className="text-xs font-medium text-neutral-600 mr-1">
                              {formatTokenWithAsset(displayAmount, displayAsset)}
                            </span>
                          ) : null
                        )}
                        <svg className={cn("size-5 text-neutral-400 transition-transform", isAssetDropdownOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isAssetDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden"
                        >
                          <div className="grid max-h-[240px] overflow-y-auto p-1.5 gap-0.5">
                            {allowedAssets.map((asset) => {
                              const key = assetKey(asset);
                              const isSelected = selectedPaidAssetKey === key;
                              const details = getAssetDetails(asset);

                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPaidAssetKey(key);
                                    setQuote(null);
                                    setIsLoadingQuote(true);
                                    setIsAssetDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-between rounded-lg p-2.5 text-left transition-all hover:bg-neutral-100",
                                    isSelected ? "bg-neutral-50/80" : "bg-transparent"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <AssetIcon code={asset.asset_code} className="size-8 p-1" />
                                    <div>
                                      <p className="font-medium text-neutral-900 text-sm">
                                        {details.name}
                                      </p>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check2 className="size-4 text-neutral-900" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {quoteError && !isRefreshingRate ? (
                    <AlertBlock type="error">{quoteError}</AlertBlock>
                  ) : null}
                  {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
                  {networkError ? <AlertBlock type="error">{networkError}</AlertBlock> : null}
                  {connectError ? <AlertBlock type="error">{connectError}</AlertBlock> : null}
                </div>

                {/* Payment Method Selector Tabs */}
                <div className="flex rounded-xl bg-neutral-100 p-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("wallet")}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-all",
                      paymentMode === "wallet"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-950"
                    )}
                  >
                    Connect Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("qr")}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-all",
                      paymentMode === "qr"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-950"
                    )}
                  >
                    QR Code
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {paymentMode === "qr" ? (
                    <motion.div
                      key="qr"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {selectedPaidAsset && selectedPaidAsset.asset_code !== settlementLabel ? (
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-full">
                            <AlertBlock type="warning">
                              QR Code payments are not supported for cross-asset payments. Please use the Connect Wallet tab to pay with {selectedPaidAsset.asset_code}, or select {settlementLabel} to pay via QR.
                            </AlertBlock>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col items-center justify-center">
                            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4">
                              {isLoadingQuote ? (
                                <div className="flex size-[200px] items-center justify-center rounded-xl bg-neutral-50 animate-pulse">
                                  <p className="text-sm font-medium text-neutral-400">Loading...</p>
                                </div>
                              ) : (
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                    `web+stellar:pay?destination=${encodeURIComponent(
                                      data.payment.receiving_address
                                    )}&amount=${encodeURIComponent(
                                      displayAmount
                                    )}&memo=${encodeURIComponent(
                                      data.payment.memo ?? ""
                                    )}&memo_type=MEMO_TEXT` +
                                      (selectedPaidAsset &&
                                      selectedPaidAsset.asset_code !== "XLM" &&
                                      selectedPaidAsset.issuer_address
                                        ? `&asset_code=${encodeURIComponent(
                                            selectedPaidAsset.asset_code
                                          )}&asset_issuer=${encodeURIComponent(
                                            selectedPaidAsset.issuer_address
                                          )}`
                                        : "")
                                  )}`}
                                  alt="Stellar QR Code"
                                  className="size-[200px]"
                                />
                              )}
                            </div>
                            <div className="mt-5 text-center text-sm font-medium text-neutral-500">
                              <span>Waiting for payment...</span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-900">Address</p>
                                <p className="truncate font-mono text-sm text-neutral-500">{data.payment.receiving_address}</p>
                              </div>
                              <CopyButton value={data.payment.receiving_address} className="shrink-0" />
                            </div>

                            <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-4">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-900">Memo <span className="text-neutral-500 font-normal">(Required)</span></p>
                                <p className="truncate font-mono text-sm text-neutral-500">{data.payment.memo}</p>
                              </div>
                              <CopyButton value={data.payment.memo ?? ""} className="shrink-0" />
                            </div>

                            <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-4">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-900">Amount</p>
                                <p className="truncate font-mono text-sm text-neutral-500">{formatTokenWithAsset(displayAmount, displayAsset)}</p>
                              </div>
                              <CopyButton value={displayAmount} className="shrink-0" />
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="wallet"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
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
                          text={`Pay ${formatTokenWithAsset(displayAmount, displayAsset)}`}
                          loading={isPaying || isRefreshingRate}
                          disabled={paymentBlocked}
                          onClick={() => void handlePay()}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
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
