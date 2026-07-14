"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Horizon } from "@stellar/stellar-sdk";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { CheckoutSandboxBanner } from "@/components/checkout/checkout-sandbox-banner";
import { BusinessMark } from "@/components/business/business-mark";
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

import type { PaymentLinkCustomerInput } from "@/lib/payment-links/types";
import { getPaymentLinkCustomerInputError } from "@/lib/payment-links/validate-customer-input";
import type {
  AllowedAsset,
  AssetBalances,
  CheckoutData,
  PaymentQuote,
} from "./checkout-types";
import { CheckoutView } from "./checkout-view";

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
  const paidAssetIssuer = params.get("paid_asset_issuer");

  if (paidAssetCode) {
    const match = allowedAssets.find(
      (asset) =>
        asset.asset_code === paidAssetCode &&
        (!paidAssetIssuer || asset.issuer_address === paidAssetIssuer)
    );

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
          <div className="relative w-full bg-white lg:w-[480px] lg:shrink-0">
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
  const [paymentMode, setPaymentMode] = useState<"wallet" | "qr">("wallet");
  const [selectedPaidAssetKey, setSelectedPaidAssetKey] = useState("");
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [isMobileItemsOpen, setIsMobileItemsOpen] = useState(false);
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [assetBalances, setAssetBalances] = useState<AssetBalances>({});
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(() =>
    getStoredCheckoutTxHash(paymentId),
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmExhausted, setConfirmExhausted] = useState(false);
  const [customerInput, setCustomerInput] = useState<PaymentLinkCustomerInput>({});
  const [restoredPaymentId, setRestoredPaymentId] = useState(paymentId);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const loadQuoteInFlightRef = useRef(false);

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
    setConfirmExhausted(false);
  }

  const environment = data?.payment.environment ?? "sandbox";
  const {
    address,
    connect,
    disconnect,
    isConnecting,
    networkError,
    connectError,
  } = useStellarWallet(environment);

  const handleUpdateWallet = useCallback(async () => {
    await disconnect();
    await connect();
  }, [connect, disconnect]);

  const allowedAssets = useMemo(
    () => data?.payment.allowed_assets ?? [],
    [data?.payment.allowed_assets],
  );
  const assetOptions = useMemo(
    () => allowedAssets.map(assetToOption),
    [allowedAssets],
  );

  const selectedPaidAsset = useMemo(() => {
    return allowedAssets.find((asset) => assetKey(asset) === selectedPaidAssetKey) ?? null;
  }, [allowedAssets, selectedPaidAssetKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadAssetBalances() {
      if (!address || allowedAssets.length === 0) {
        setAssetBalances({});
        return;
      }

      try {
        const account = await new Horizon.Server(getHorizonUrl(environment)).loadAccount(address);
        const nextBalances: AssetBalances = {};

        for (const asset of allowedAssets) {
          const balance = account.balances.find((entry) =>
            asset.asset_code === "XLM"
              ? entry.asset_type === "native"
              : "asset_code" in entry &&
                entry.asset_code === asset.asset_code &&
                "asset_issuer" in entry &&
                entry.asset_issuer === asset.issuer_address
          );

          nextBalances[assetKey(asset)] = balance?.balance ?? null;
        }

        if (!cancelled) {
          setAssetBalances(nextBalances);
        }
      } catch {
        if (!cancelled) {
          setAssetBalances({});
        }
      }
    }

    void loadAssetBalances();

    return () => {
      cancelled = true;
    };
  }, [address, allowedAssets, environment]);

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

    const cacheKey = `payoes:quote:${paymentId}:${selectedPaidAsset.asset_code}:${selectedPaidAsset.issuer_address ?? ""}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as PaymentQuote;
        const expiresAtMs = new Date(parsed.expires_at).getTime();
        if (expiresAtMs > Date.now() + 1500) {
          setQuote(parsed);
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    if (loadQuoteInFlightRef.current) {
      return;
    }

    loadQuoteInFlightRef.current = true;
    setIsLoadingQuote(true);
    setQuoteError(null);

    try {
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

      if (!response.ok) {
        setQuote(null);
        setQuoteError(quoteData.error ?? "Unable to load payment quote");
        return;
      }

      setQuote(quoteData);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(quoteData));
      } catch (e) {
        // ignore
      }
    } finally {
      loadQuoteInFlightRef.current = false;
      setIsLoadingQuote(false);
    }
  }, [hasPricing, paymentId, selectedPaidAsset]);

  const { countdown, quoteExpired, isRefreshingRate, rateLockLabel } =
    usePaymentQuoteCountdown({
      expiresAt: hasPricing ? quote?.expires_at : null,
      isLoadingQuote,
      quoteError,
      loadQuote,
    });

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const selectedAssetKey = selectedPaidAsset ? assetKey(selectedPaidAsset) : null;
  const selectedAssetBalance = selectedAssetKey
    ? assetBalances[selectedAssetKey]
    : undefined;
  const walletAssetCheckLoading = Boolean(
    address && selectedAssetKey && !(selectedAssetKey in assetBalances)
  );
  const walletAssetError =
    address && selectedPaidAsset && selectedAssetBalance === null
      ? `${selectedPaidAsset.asset_code} is not available in this wallet. Add the trustline or choose another asset.`
      : address &&
          selectedPaidAsset &&
          quote &&
          selectedAssetBalance &&
          Number(selectedAssetBalance) < Number(quote.paid_amount)
        ? `Insufficient ${selectedPaidAsset.asset_code} balance. Choose another asset or fund this wallet.`
        : null;
  const paymentBlocked =
    (hasPricing && (!quote || isLoadingQuote || quoteExpired || isRefreshingRate)) ||
    walletAssetCheckLoading ||
    Boolean(walletAssetError);

  const showQuoteAmountLoading = isLoadingQuote && !quote;
  const showQrLoading = isLoadingQuote && (isRefreshingRate || !quote);

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
    const pollAddress =
      data?.payment.deposit_address ?? data?.payment.receiving_address;

    if (isPayCompleted || isPayExpired || !data?.payment.memo) {
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

          if (statusData.payment.status === "refunded") {
            setPendingTxHash(null);
            sessionStorage.removeItem(`payoes:checkout-tx:${paymentId}`);
            setData(statusData);
            return;
          }

          if (statusData.payment.status === "pending") {
            setData(statusData);
          }
        }

        if (data.payment.payment_flow !== "escrow" && pollAddress) {
          const horizonUrl = getHorizonUrl(data.payment.environment);
          const server = new Horizon.Server(horizonUrl);
          const response = await server
            .transactions()
            .forAccount(pollAddress)
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
        }
      } catch (err) {
        console.error("Auto-detect polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [
    data?.payment.deposit_address,
    data?.payment.receiving_address,
    data?.payment.memo,
    data?.payment.status,
    data?.payment.session_error,
    data?.payment.environment,
    paymentId,
  ]);

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

  const reloadCheckoutData = useCallback(async () => {
    const response = await fetch(`/api/checkout/${paymentId}`);
    const json = (await response.json()) as CheckoutData & { error?: string };

    if (response.ok) {
      setData(json);
    }

    return json;
  }, [paymentId]);

  const confirmPayment = useCallback(
    async (txHash: string) => {
      const confirmResponse = await fetch(`/api/checkout/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_escrow_contract",
          txHash,
          payerAddress: address,
        }),
      });

      const confirmData = (await confirmResponse.json().catch(() => ({}))) as {
        status?: string;
        error?: string;
        setup?: string[];
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
        setPendingTxHash(null);
        sessionStorage.removeItem(`payoes:checkout-tx:${paymentId}`);
        const setupHint =
          confirmData.setup && confirmData.setup.length > 0
            ? ` ${confirmData.setup.join(" ")}`
            : "";
        setError((confirmData.error ?? "Payment verification failed") + setupHint);
        await reloadCheckoutData();
        return false;
      }

      setPendingTxHash(null);
      setConfirmExhausted(false);
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
    },
    [address, paymentId, reloadCheckoutData],
  );

  useEffect(() => {
    if (
      !pendingTxHash ||
      !address ||
      data?.payment.status === "completed" ||
      data?.payment.status === "expired"
    ) {
      return;
    }

    let cancelled = false;

    async function pollConfirmation() {
      setIsConfirming(true);
      setConfirmExhausted(false);

      for (let attempt = 0; attempt < 30 && !cancelled; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const confirmed = await confirmPayment(pendingTxHash!);
        if (confirmed || cancelled) {
          setIsConfirming(false);
          return;
        }

        const refreshed = await reloadCheckoutData();
        if (cancelled) {
          return;
        }

        if (refreshed.payment?.status === "completed") {
          setPendingTxHash(null);
          setConfirmExhausted(false);
          sessionStorage.removeItem(`payoes:checkout-tx:${paymentId}`);
          setIsConfirming(false);
          return;
        }
      }

      if (!cancelled) {
        setIsConfirming(false);
        setConfirmExhausted(true);
      }
    }

    void pollConfirmation();

    return () => {
      cancelled = true;
      setIsConfirming(false);
    };
  }, [
    address,
    confirmPayment,
    data?.payment.status,
    paymentId,
    pendingTxHash,
    reloadCheckoutData,
  ]);

  async function handlePay() {
    if (!data || !address || !selectedPaidAsset) {
      return;
    }

    const customerInputError = getPaymentLinkCustomerInputError(
      customerInput,
      data.customer_collection,
    );

    if (customerInputError) {
      setError(customerInputError);
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
        payment_type?: string;
        error?: string;
        setup?: string[];
      };

      if (!buildResponse.ok || !buildData.xdr) {
        const setupHint =
          buildData.setup && buildData.setup.length > 0
            ? ` ${buildData.setup.join(" ")}`
            : "";
        setError((buildData.error ?? "Unable to build transaction") + setupHint);
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

      const submitResult = await (async () => {
        const response = await fetch(`/api/checkout/${paymentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit_soroban",
            signedXdr: signedTxXdr,
          }),
        });
        const payload = (await response.json()) as {
          tx_hash?: string;
          error?: string;
          setup?: string[];
        };

        if (!response.ok || !payload.tx_hash) {
          const setupHint =
            payload.setup && payload.setup.length > 0
              ? ` ${payload.setup.join(" ")}`
              : "";
          throw new Error(
            (payload.error ?? "Unable to submit Soroban payment") + setupHint,
          );
        }

        return { hash: payload.tx_hash };
      })();

      setPendingTxHash(submitResult.hash);
      sessionStorage.setItem(`payoes:checkout-tx:${paymentId}`, submitResult.hash);
    } catch (payError) {
      setError(formatHorizonSubmitError(payError));
    } finally {
      setIsPaying(false);
    }
  }

  async function handleSimulatePayment() {
    if (!data || !selectedPaidAsset || isRefreshingRate) {
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
  const lastAttemptError = data.payment.last_attempt_error;
  const qrDestination =
    data.payment.deposit_address ?? data.payment.receiving_address;
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
    <CheckoutView
      data={data}
      isCompleted={isCompleted}
      isSessionExpired={isSessionExpired}
      lastAttemptError={lastAttemptError}
      qrDestination={qrDestination}
      settlementLabel={settlementLabel}
      isSandbox={isSandbox}
      sourceLabel={sourceLabel}
      currencyCode={currencyCode}
      hasPricing={hasPricing}
      showQuoteAmountLoading={showQuoteAmountLoading}
      displayAmount={displayAmount}
      displayAsset={displayAsset}
      quote={quote}
      rateLockLabel={rateLockLabel}
      countdown={countdown}
      isRefreshingRate={isRefreshingRate}
      isSimulating={isSimulating}
      allowedAssets={allowedAssets}
      selectedPaidAsset={selectedPaidAsset}
      selectedPaidAssetKey={selectedPaidAssetKey}
      setSelectedPaidAssetKey={setSelectedPaidAssetKey}
      assetBalances={assetBalances}
      isAssetDropdownOpen={isAssetDropdownOpen}
      setIsAssetDropdownOpen={setIsAssetDropdownOpen}
      isMobileItemsOpen={isMobileItemsOpen}
      setIsMobileItemsOpen={setIsMobileItemsOpen}
      paymentMode={paymentMode}
      setPaymentMode={setPaymentMode}
      address={address}
      pendingTxHash={pendingTxHash}
      isPaying={isPaying}
      isConfirming={isConfirming}
      confirmExhausted={confirmExhausted}
      isConnecting={isConnecting}
      paymentBlocked={paymentBlocked}
      quoteError={quoteError}
      walletAssetError={walletAssetError}
      error={error}
      networkError={networkError}
      connectError={connectError}
      showQrLoading={showQrLoading}
      dropdownRef={dropdownRef}
      onSimulatePayment={() => void handleSimulatePayment()}
      onConnectWallet={() => void connect()}
      onUpdateWallet={() => void handleUpdateWallet()}
      onPay={() => void handlePay()}
      onRetryConfirm={() => {
        setConfirmExhausted(false);
        setIsConfirming(true);
        void confirmPayment(pendingTxHash!).finally(() => {
          setIsConfirming(false);
        });
      }}
      customerInput={customerInput}
      onCustomerInputChange={setCustomerInput}
    />
  );
}
