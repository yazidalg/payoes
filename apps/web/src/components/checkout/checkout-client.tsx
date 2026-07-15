"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Horizon } from "@stellar/stellar-sdk";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { CheckoutSandboxBanner } from "@/components/checkout/checkout-sandbox-banner";
import { CheckoutErrorBanner } from "@/components/checkout/checkout-error-banner";
import { BusinessMark } from "@/components/business/business-mark";
import { useStellarWallet } from "@/hooks/use-stellar-wallet";
import { usePaymentQuoteCountdown } from "@/hooks/use-payment-quote-countdown";
import { useCheckoutQuotes } from "@/hooks/use-checkout-quotes";
import { useCheckoutEmbed } from "@/hooks/use-checkout-embed";
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
  CheckoutData,
} from "./checkout-types";
import { CheckoutView } from "./checkout-view";
import {
  isCheckoutProcessingStatus,
  isCheckoutSessionExpired,
} from "@/lib/checkout/payment-state";

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


export function CheckoutClient({
  paymentId,
  embedded = false,
}: {
  paymentId: string;
  embedded?: boolean;
}) {
  const [data, setData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMode, setPaymentMode] = useState<"wallet" | "qr">("wallet");
  const [selectedPaidAssetKey, setSelectedPaidAssetKey] = useState("");
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [isMobileItemsOpen, setIsMobileItemsOpen] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(() =>
    getStoredCheckoutTxHash(paymentId),
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmExhausted, setConfirmExhausted] = useState(false);
  const [isCheckingDeposit, setIsCheckingDeposit] = useState(false);
  const [depositCheckInfo, setDepositCheckInfo] = useState<string | null>(null);
  const [customerInput, setCustomerInput] = useState<PaymentLinkCustomerInput>({});
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
  } = useStellarWallet(environment, { restoreSession: false });

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

  const selectedAssetOption = useMemo(
    () => assetOptions.find((option) => option.value === selectedPaidAssetKey) ?? null,
    [assetOptions, selectedPaidAssetKey],
  );

  const hasPricing = Boolean(
    data?.payment.pricing_currency && data?.payment.pricing_amount,
  );

  const paymentStatus = data?.payment.status;
  const skipQuotes =
    Boolean(pendingTxHash) ||
    paymentStatus === "completed" ||
    (paymentStatus != null && isCheckoutProcessingStatus(paymentStatus));

  const { quote, quoteError, isLoadingQuote, loadQuote } = useCheckoutQuotes({
    paymentId,
    allowedAssets,
    selectedPaidAsset,
    hasPricing,
    disabled: skipQuotes,
  });

  useEffect(() => {
    if (paymentStatus === "completed") {
      setError(null);
      setPendingTxHash(null);
      sessionStorage.removeItem(`payoes:checkout-tx:${paymentId}`);
    }
  }, [paymentId, paymentStatus]);

  const { countdown, quoteExpired, isRefreshingRate, rateLockLabel } =
    usePaymentQuoteCountdown({
      expiresAt: hasPricing ? quote?.expires_at : null,
      isLoadingQuote,
      quoteError,
      loadQuote,
    });

  const depositTrustlineError = quote?.deposit_trustline_error ?? null;
  const isPayProcessing = data
    ? isCheckoutProcessingStatus(data.payment.status)
    : false;
  const paymentBlocked =
    isPayProcessing ||
    Boolean(depositTrustlineError) ||
    (hasPricing && (!quote || isLoadingQuote || quoteExpired || isRefreshingRate));

  const showQuoteAmountLoading = isLoadingQuote && !quote;
  const showQrLoading = isLoadingQuote && (isRefreshingRate || !quote);
  const isFetchingQuote = hasPricing && (isLoadingQuote || isRefreshingRate);

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
    const isPayExpired = data
      ? isCheckoutSessionExpired(data.payment)
      : false;
    const isPayProcessing = data
      ? isCheckoutProcessingStatus(data.payment.status)
      : false;
    const pollAddress =
      data?.payment.deposit_address ?? data?.payment.receiving_address;

    if (isPayCompleted || isPayExpired || isPayProcessing) {
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

          if (
            isCheckoutProcessingStatus(statusData.payment.status) ||
            statusData.payment.status === "pending"
          ) {
            setData(statusData);
          }
        }

        if (data?.payment.payment_flow !== "escrow" && pollAddress && data?.payment.memo) {
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
    data?.payment.payment_flow,
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

  useEffect(() => {
    const shouldPoll =
      (data != null && isCheckoutProcessingStatus(data.payment.status)) ||
      Boolean(pendingTxHash);

    if (!shouldPoll) {
      return;
    }

    const interval = setInterval(() => {
      void (async () => {
        if (!data) {
          return;
        }

        try {
          if (data.payment.payment_flow === "escrow") {
            await fetch(`/api/checkout/${paymentId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "check_deposit",
                tx_hash: pendingTxHash ?? undefined,
              }),
            });
          }
        } catch {
          // Fall through to reload below.
        }

        await reloadCheckoutData();
      })();
    }, 3000);

    return () => clearInterval(interval);
  }, [
    data?.payment.payment_flow,
    data?.payment.status,
    paymentId,
    pendingTxHash,
    reloadCheckoutData,
  ]);

  const confirmPayment = useCallback(
    async (txHash: string) => {
      const confirmResponse = await fetch(`/api/checkout/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_classic_deposit",
          txHash,
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
        setError(null);
        return false;
      }

      if (!confirmResponse.ok) {
        const message = confirmData.error ?? "Payment verification failed";
        const isTransientDepositDelay =
          message.includes("Deposit not detected yet") ||
          message.includes("Deposit is still processing");

        if (isTransientDepositDelay) {
          setPendingTxHash(txHash);
          sessionStorage.setItem(`payoes:checkout-tx:${paymentId}`, txHash);
          setError(null);
          return false;
        }

        setPendingTxHash(null);
        sessionStorage.removeItem(`payoes:checkout-tx:${paymentId}`);
        const setupHint =
          confirmData.setup && confirmData.setup.length > 0
            ? ` ${confirmData.setup.join(" ")}`
            : "";
        setError(message + setupHint);
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
          setError(null);
          return;
        }

        if (
          refreshed.payment?.status === "deposit_received" ||
          refreshed.payment?.status === "settling"
        ) {
          setError(null);
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
            action: "submit_classic",
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
            (payload.error ?? "Unable to submit payment") + setupHint,
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

  async function handleCheckDeposit() {
    if (!data || isCheckingDeposit || isRefreshingRate) {
      return;
    }

    setIsCheckingDeposit(true);
    setDepositCheckInfo(null);
    setError(null);

    try {
      const response = await fetch(`/api/checkout/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_deposit",
          tx_hash: pendingTxHash ?? undefined,
        }),
      });

      const payload = (await response.json()) as {
        status?: string;
        detected?: boolean;
        error?: string;
        setup?: string[];
      };

      if (!response.ok) {
        const setupHint =
          payload.setup && payload.setup.length > 0
            ? ` ${payload.setup.join(" ")}`
            : "";

        if (response.status === 409 && payload.status === "settlement_failed") {
          setError(
            (payload.error ??
              "Settlement could not be completed. Please contact the merchant.") +
              setupHint,
          );
          await reloadCheckoutData();
          return;
        }

        setError((payload.error ?? "Unable to check payment") + setupHint);
        return;
      }

      if (payload.status === "completed") {
        setDepositCheckInfo(null);
        await reloadCheckoutData();
        return;
      }

      if (payload.status === "refunded") {
        setDepositCheckInfo(null);
        await reloadCheckoutData();
        return;
      }

      if (
        payload.status === "processing" ||
        payload.status === "deposit_received" ||
        payload.status === "refunding" ||
        payload.status === "settling" ||
        response.status === 202
      ) {
        setDepositCheckInfo(
          "Payment detected. Processing your transaction. This may take a moment.",
        );
        await reloadCheckoutData();
        return;
      }

      if (payload.status === "settlement_failed") {
        setError(
          "Settlement could not be completed. Please contact the merchant if your funds were not returned.",
        );
        await reloadCheckoutData();
        return;
      }

      setDepositCheckInfo(
        "Payment not detected yet. Please wait a moment and try again.",
      );
    } catch {
      setError("Unable to check payment. Please try again.");
    } finally {
      setIsCheckingDeposit(false);
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

  useCheckoutEmbed({
    embedded,
    paymentId,
    status: data?.payment.status,
    txHash: pendingTxHash,
    isLoaded: Boolean(data),
  });

  useEffect(() => {
    if (!embedded) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlHeight = html.style.height;
    const previousBodyHeight = body.style.height;
    const previousBodyOverflow = body.style.overflow;

    html.style.height = "100%";
    body.style.height = "100%";
    body.style.overflow = "hidden";

    return () => {
      html.style.height = previousHtmlHeight;
      body.style.height = previousBodyHeight;
      body.style.overflow = previousBodyOverflow;
    };
  }, [embedded]);

  if (isLoading) {
    return <CheckoutLoadingState />;
  }

  if (!data) {
    const notFoundMessage = error ?? "Payment not found";

    return (
      <div className="relative flex min-h-svh items-center justify-center bg-neutral-50 p-6 pb-20">
        <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-600">{notFoundMessage}</p>
        </div>
        <CheckoutErrorBanner message={notFoundMessage} />
      </div>
    );
  }

  const isCompleted = data.payment.status === "completed";
  const isProcessing =
    isCheckoutProcessingStatus(data.payment.status) ||
    Boolean(pendingTxHash) ||
    isConfirming;
  const isSessionExpired = isCheckoutSessionExpired(data.payment);
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

  const checkoutView = (
    <CheckoutView
      data={data}
      isCompleted={isCompleted}
      isProcessing={isProcessing}
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
      isFetchingQuote={isFetchingQuote}
      paymentBlocked={paymentBlocked}
      quoteError={quoteError}
      depositTrustlineError={depositTrustlineError}
      error={error}
      networkError={networkError}
      connectError={connectError}
      showQrLoading={showQrLoading}
      dropdownRef={dropdownRef}
      onSimulatePayment={() => void handleSimulatePayment()}
      onConnectWallet={() => void connect()}
      onUpdateWallet={() => void handleUpdateWallet()}
      onPay={() => void handlePay()}
      onCheckDeposit={
        data.payment.payment_flow === "escrow" ? () => void handleCheckDeposit() : undefined
      }
      isCheckingDeposit={isCheckingDeposit}
      depositCheckInfo={depositCheckInfo}
      onRetryConfirm={() => {
        setConfirmExhausted(false);
        setIsConfirming(true);
        void confirmPayment(pendingTxHash!).finally(() => {
          setIsConfirming(false);
        });
      }}
      customerInput={customerInput}
      onCustomerInputChange={setCustomerInput}
      embedded={embedded}
    />
  );

  if (!embedded) {
    return checkoutView;
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white">
      {checkoutView}
    </div>
  );
}
