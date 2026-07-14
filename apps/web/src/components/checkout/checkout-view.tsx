"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@dub/utils";
import { Badge, Button, CopyButton, Tooltip, InfoTooltip } from "@dub/ui";
import { Check2, LoadingSpinner } from "@dub/ui/icons";
import { getAssetIconUrl } from "@/lib/assets/icons";
import { getOfficialAsset } from "@/lib/payment-methods/official-assets";
import { ConnectedWallet } from "@/ui/wallet/connected-wallet";
import { CheckoutSandboxBanner } from "@/components/checkout/checkout-sandbox-banner";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import { AlertBlock } from "@/components/shared/alert-block";
import { formatInvoiceAmount } from "@/lib/invoices/amount";
import { formatAmountWithUnit, formatTokenWithAsset } from "@/lib/format/amount";
import type { AllowedAsset, CheckoutData, PaymentQuote } from "./checkout-types";

export function AssetIcon({ code, className }: { code: string; className?: string }) {
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

export function getAssetDetails(asset: AllowedAsset) {
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

function assetKey(asset: AllowedAsset) {
  return `${asset.asset_code}:${asset.issuer_address ?? ""}`;
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

function formatCheckoutDueDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RateLockBadge({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  return (
    <Tooltip content={content}>
      <span className="inline-flex cursor-help">{children}</span>
    </Tooltip>
  );
}

export function RateLockCountdown({
  countdown,
  isRefreshingRate,
}: {
  countdown: string;
  isRefreshingRate: boolean;
  disabled?: boolean;
}) {
  const badgeClassName = "inline-flex items-center gap-1.5 tabular-nums";

  if (isRefreshingRate) {
    return (
      <RateLockBadge content="Fetching a new exchange rate. Payment actions pause briefly.">
        <Badge variant="gray" className={badgeClassName}>
          <LoadingSpinner className="size-3 shrink-0 text-neutral-600" />
          Updating
        </Badge>
      </RateLockBadge>
    );
  }

  if (countdown === "Expired") {
    return (
      <RateLockBadge content="The rate lock expired. A new rate will load automatically.">
        <Badge variant="gray" className="text-neutral-900">
          Expired
        </Badge>
      </RateLockBadge>
    );
  }

  return (
    <RateLockBadge content="Exchange rate is locked for this countdown">
      <Badge variant="black" className={badgeClassName}>
        {countdown}
      </Badge>
    </RateLockBadge>
  );
}

export type CheckoutViewProps = {
  data: CheckoutData;
  isCompleted: boolean;
  isSessionExpired: boolean;
  lastAttemptError: string | null | undefined;
  qrDestination: string;
  settlementLabel: string;
  isSandbox: boolean;
  sourceLabel: string;
  currencyCode: string;
  hasPricing: boolean;
  showQuoteAmountLoading: boolean;
  displayAmount: string;
  displayAsset: string;
  quote: PaymentQuote | null;
  rateLockLabel: string | null | undefined;
  isRefreshingRate: boolean;
  isSimulating: boolean;
  allowedAssets: AllowedAsset[];
  selectedPaidAsset: AllowedAsset | null;
  selectedPaidAssetKey: string;
  setSelectedPaidAssetKey: (key: string) => void;
  isAssetDropdownOpen: boolean;
  setIsAssetDropdownOpen: (open: boolean) => void;
  isMobileItemsOpen: boolean;
  setIsMobileItemsOpen: (open: boolean) => void;
  paymentMode: "wallet" | "qr";
  setPaymentMode: (mode: "wallet" | "qr") => void;
  address: string | null;
  pendingTxHash: string | null;
  isPaying: boolean;
  isConnecting: boolean;
  paymentBlocked: boolean;
  quoteError: string | null;
  error: string | null;
  networkError: string | null;
  connectError: string | null;
  showQrLoading: boolean;
  dropdownRef?: React.RefObject<HTMLDivElement | null>;
  // Callbacks
  onSimulatePayment?: () => void;
  onConnectWallet?: () => void;
  onPay?: () => void;
  onRetryConfirm?: () => void;
  disabled?: boolean;
  countdown?: string;
};

export function CheckoutView({
  data,
  isCompleted,
  isSessionExpired,
  lastAttemptError,
  qrDestination,
  settlementLabel,
  isSandbox,
  sourceLabel,
  currencyCode,
  hasPricing,
  showQuoteAmountLoading,
  displayAmount,
  displayAsset,
  quote,
  rateLockLabel,
  isRefreshingRate,
  isSimulating,
  allowedAssets,
  selectedPaidAsset,
  selectedPaidAssetKey,
  setSelectedPaidAssetKey,
  isAssetDropdownOpen,
  setIsAssetDropdownOpen,
  isMobileItemsOpen,
  setIsMobileItemsOpen,
  paymentMode,
  setPaymentMode,
  address,
  pendingTxHash,
  isPaying,
  isConnecting,
  paymentBlocked,
  quoteError,
  error,
  networkError,
  connectError,
  showQrLoading,
  dropdownRef,
  onSimulatePayment,
  onConnectWallet,
  onPay,
  onRetryConfirm,
  disabled = false,
  countdown = "",
}: CheckoutViewProps) {
  const lineItems = data.items ?? [];

  function formatLineAmount(amount: string) {
    if (hasPricing) {
      return formatAmountWithUnit(amount, currencyCode);
    }
    return formatTokenWithAsset(amount, settlementLabel);
  }

  return (
    <div className={cn("relative bg-white text-left flex flex-col flex-1 @container", disabled ? "min-h-full h-full" : "min-h-svh")}>
      <div className={cn("relative z-10 flex flex-col flex-1", disabled ? "h-full" : "min-h-svh")}>
        {/* Hide sandbox banner when in preview (disabled) */}
        {isSandbox && !disabled ? (
          <CheckoutSandboxBanner
            onSimulate={disabled ? undefined : onSimulatePayment}
            isSimulating={isSimulating}
            simulateDisabled={disabled || isCompleted || isRefreshingRate}
          />
        ) : null}

        <div className="flex flex-1 flex-col @lg:flex-row">
          {/* Order Summary (Left) */}
          <div
            className={cn(
              "flex-none border-b border-neutral-200/60 bg-neutral-50 px-4 py-4",
              "@lg:flex-1 @lg:border-b-0 @lg:border-r",
              disabled
                ? "@lg:px-4 @lg:py-4"
                : "@lg:px-8 @lg:py-8"
            )}
          >
            <div className={cn("mx-auto max-w-md", disabled ? "space-y-3" : "space-y-4 @lg:space-y-6")}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  {data.merchant ? (
                    <div className={cn("flex shrink-0 overflow-hidden rounded-full", disabled ? "size-7" : "size-8 @lg:size-10")}>
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
                    {data.invoice ? (
                      <>
                        <p
                          className={cn(
                            "truncate font-semibold text-neutral-900",
                            disabled ? "text-sm" : "text-base",
                          )}
                        >
                          {data.merchant?.name ?? "Merchant"}
                        </p>
                        <p
                          className={cn(
                            "mt-1 truncate text-neutral-500",
                            disabled ? "text-xs" : "text-sm",
                          )}
                        >
                          {data.invoice.invoice_number}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={cn("truncate text-neutral-500 hidden @lg:block", disabled ? "text-[10px]" : "text-sm")}>{sourceLabel}</p>
                        <p className={cn("truncate font-medium text-neutral-900", disabled ? "text-xs" : "text-sm @lg:text-base")}>
                          {data.merchant?.name ?? "Merchant"}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {data.invoice?.due_at ? (
                    <div className="hidden @lg:block">
                      <p className="text-[10px] text-neutral-500">Due</p>
                      <p className={cn("font-medium text-neutral-900", disabled ? "text-xs" : "text-sm")}>
                        {formatCheckoutDueDate(data.invoice.due_at)}
                      </p>
                    </div>
                  ) : null}
                  {data.invoice?.due_at ? (
                    <div className="@lg:hidden space-y-2">
                      <div>
                        <p className="text-[10px] text-neutral-500">Due</p>
                        <p className={cn("font-medium text-neutral-900", disabled ? "text-xs" : "text-sm")}>
                          {formatCheckoutDueDate(data.invoice.due_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-500">Total</p>
                        <p className={cn("font-semibold text-neutral-900", disabled ? "text-xs" : "text-sm")}>
                          {hasPricing ? (
                            formatInvoiceAmount(
                              data.payment.pricing_amount!,
                              data.payment.pricing_currency!,
                            )
                          ) : (
                            formatTokenWithAsset(data.payment.amount, settlementLabel)
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="@lg:hidden">
                      <p className="text-[10px] text-neutral-500">Total</p>
                      <p className={cn("font-semibold text-neutral-900", disabled ? "text-xs" : "text-sm")}>
                        {hasPricing ? (
                          formatInvoiceAmount(
                            data.payment.pricing_amount!,
                            data.payment.pricing_currency!,
                          )
                        ) : (
                          formatTokenWithAsset(data.payment.amount, settlementLabel)
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {data.invoice ? (
                <div className={cn("border-t border-neutral-200/60 pt-3", disabled ? "space-y-1" : "space-y-1.5")}>
                  <p className={cn("text-neutral-500", disabled ? "text-[10px]" : "text-xs")}>Bill to</p>
                  <p className={cn("font-medium text-neutral-900", disabled ? "text-xs" : "text-sm")}>
                    {data.invoice.customer.name ?? data.invoice.customer.email ?? "Customer"}
                  </p>
                  {data.invoice.customer.name && data.invoice.customer.email ? (
                    <p className={cn("text-neutral-500", disabled ? "text-[10px]" : "text-xs")}>
                      {data.invoice.customer.email}
                    </p>
                  ) : null}
                  {data.invoice.memo ? (
                    <div className={cn("border-t border-neutral-200/60 pt-2", disabled ? "space-y-0.5" : "space-y-1")}>
                      <p className={cn("text-neutral-500", disabled ? "text-[10px]" : "text-xs")}>Memo</p>
                      <p className={cn("whitespace-pre-wrap text-neutral-900", disabled ? "text-xs" : "text-sm")}>
                        {data.invoice.memo}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Mobile Compact Line Items */}
              <div className="@lg:hidden">
                {lineItems.length > 0 && (
                  <div className="border-t border-neutral-200/60 pt-3 mt-3">
                    <button
                      type="button"
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

              {/* Desktop Line Items */}
              <div className="hidden @lg:block space-y-4">
                {lineItems.length > 0 ? (
                  <div className={cn("space-y-3 border-b border-neutral-200", disabled ? "pb-3" : "pb-4")}>
                    {lineItems.map((item, index) => (
                      <div
                        key={`${item.description}-${index}`}
                        className="flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className={cn("font-medium text-neutral-900", disabled ? "text-xs" : "text-sm")}>
                            {item.description}
                          </p>
                          <p className="mt-0.5 text-[10px] text-neutral-500">
                            {item.quantity} × {formatLineAmount(item.unit_amount)}
                          </p>
                        </div>
                        <p className={cn("shrink-0 font-medium text-neutral-900", disabled ? "text-xs" : "text-sm")}>
                          {formatLineAmount(item.line_amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-b border-neutral-200 pb-4">
                    <p className={cn("text-neutral-500", disabled ? "text-xs" : "text-sm")}>
                      {data.payment.description ?? "No line items for this payment."}
                    </p>
                  </div>
                )}

                <div className={cn("space-y-2 border-b border-neutral-200", disabled ? "pb-3" : "pb-4")}>
                  <div className={cn("flex items-center justify-between gap-4", disabled ? "text-xs" : "text-sm")}>
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
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className={cn("font-medium text-neutral-900", disabled ? "text-xs" : "text-sm")}>Total due</span>
                  <p className={cn("font-semibold text-neutral-900", disabled ? "text-base" : "text-lg")}>
                    {hasPricing
                      ? formatInvoiceAmount(
                          data.payment.pricing_amount!,
                          data.payment.pricing_currency!,
                        )
                      : formatTokenWithAsset(data.payment.amount, settlementLabel)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section (Right) */}
          <div className="relative flex-1 bg-white flex flex-col justify-between">
            <div
              className={cn(
                "relative z-10 px-6 py-8",
                disabled
                  ? "@lg:px-4 @lg:py-4"
                  : "@lg:px-12 @lg:py-12"
              )}
            >
              <div className={cn("mx-auto max-w-md", disabled ? "space-y-4" : "space-y-6")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className={cn("font-semibold text-neutral-900", disabled ? "text-sm" : "text-base")}>Payment</h2>
                    <p className={cn("mt-1 text-neutral-500", disabled ? "text-xs" : "text-sm")}>
                      Connect your Stellar wallet and complete the payment.
                    </p>
                  </div>
                  {(hasPricing || disabled) && countdown ? (
                    <div className="shrink-0">
                      <RateLockCountdown
                        countdown={countdown}
                        isRefreshingRate={isRefreshingRate}
                      />
                    </div>
                  ) : null}
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
                  <div className={cn(disabled ? "space-y-4" : "space-y-5")}>
                    {lastAttemptError ? (
                      <AlertBlock type="info">
                        {lastAttemptError} You can try again below using the same payment
                        link and memo.
                      </AlertBlock>
                    ) : null}

                    {allowedAssets.length > 1 ? (
                      <div ref={dropdownRef} className="relative space-y-1.5">
                        <label className={cn("font-medium text-neutral-900", disabled ? "text-xs" : "text-sm")}>
                          Pay with
                        </label>
                        <div
                          className={cn(
                            "rounded-xl bg-neutral-100 p-1",
                            isRefreshingRate && "opacity-60",
                          )}
                        >
                          <button
                            type="button"
                            disabled={disabled || isRefreshingRate}
                            onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg bg-white text-left font-semibold text-neutral-900 shadow-sm transition-all",
                              disabled ? "p-2 text-xs" : "p-2.5 text-sm",
                              isRefreshingRate && "cursor-not-allowed",
                            )}
                          >
                            {selectedPaidAsset && (
                              <div className="flex min-w-0 items-center gap-2.5">
                                <AssetIcon code={selectedPaidAsset.asset_code} className={cn(disabled ? "size-7 p-0.5" : "size-8 p-1")} />
                                <div className="min-w-0">
                                  <p className="truncate text-neutral-900">
                                    {getAssetDetails(selectedPaidAsset).name}
                                  </p>
                                  <p className="truncate text-[10px] font-normal text-neutral-500">
                                    {getAssetDetails(selectedPaidAsset).description}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex shrink-0 items-center gap-2 pl-2">
                              {hasPricing && (
                                showQuoteAmountLoading ? (
                                  <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
                                ) : quote ? (
                                  <span className="text-xs font-medium text-neutral-600">
                                    {formatTokenWithAsset(displayAmount, displayAsset)}
                                  </span>
                                ) : null
                              )}
                              <svg
                                className={cn("size-4 text-neutral-400 transition-transform", isAssetDropdownOpen && "rotate-180")}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                        </div>

                        <AnimatePresence>
                          {isAssetDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.98 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg"
                            >
                              <div className="grid max-h-[240px] gap-0.5 overflow-y-auto">
                                {allowedAssets.map((asset) => {
                                  const key = assetKey(asset);
                                  const isSelected = selectedPaidAssetKey === key;
                                  const details = getAssetDetails(asset);

                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      disabled={disabled || isRefreshingRate}
                                      onClick={() => {
                                        setSelectedPaidAssetKey(key);
                                        setIsAssetDropdownOpen(false);
                                      }}
                                      className={cn(
                                        "flex w-full items-center justify-between rounded-lg p-2.5 text-left transition-all",
                                        isSelected
                                          ? "bg-neutral-100 text-neutral-900"
                                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                                      )}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <AssetIcon code={asset.asset_code} className="size-7 p-0.5" />
                                        <p className="text-sm font-medium">{details.name}</p>
                                      </div>
                                      {isSelected ? (
                                        <Check2 className="size-4 text-neutral-900" />
                                      ) : null}
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
                      {isRefreshingRate ? (
                        <AlertBlock type="info">
                          Rate lock is refreshing. Payment actions are paused until the
                          new rate is ready.
                        </AlertBlock>
                      ) : null}
                      {quoteError && !isRefreshingRate ? (
                        <AlertBlock type="error">{quoteError}</AlertBlock>
                      ) : null}
                      {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
                      {networkError ? <AlertBlock type="error">{networkError}</AlertBlock> : null}
                      {connectError ? <AlertBlock type="error">{connectError}</AlertBlock> : null}
                    </div>

                    {/* Payment Method Selector Tabs */}
                    <div
                      className={cn(
                        "flex rounded-xl bg-neutral-100 p-1",
                        disabled ? "h-9 items-center" : "",
                        isRefreshingRate && "opacity-60",
                      )}
                    >
                      <button
                        type="button"
                        disabled={isRefreshingRate}
                        onClick={() => setPaymentMode("wallet")}
                        className={cn(
                          "flex-1 rounded-lg text-center font-semibold transition-all",
                          disabled ? "py-1 text-xs" : "py-2 text-sm",
                          paymentMode === "wallet"
                            ? "bg-white text-neutral-900 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-950",
                          isRefreshingRate && "cursor-not-allowed",
                        )}
                      >
                        Connect Wallet
                      </button>
                      <button
                        type="button"
                        disabled={isRefreshingRate}
                        onClick={() => setPaymentMode("qr")}
                        className={cn(
                          "flex-1 rounded-lg text-center font-semibold transition-all",
                          disabled ? "py-1 text-xs" : "py-2 text-sm",
                          paymentMode === "qr"
                            ? "bg-white text-neutral-900 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-950",
                          isRefreshingRate && "cursor-not-allowed",
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
                          className={cn(disabled ? "space-y-4" : "space-y-6")}
                        >
                          <>
                            <div className="flex flex-col items-center justify-center">
                              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-3">
                                {showQrLoading ? (
                                  <div className="flex size-[130px] items-center justify-center rounded-xl bg-neutral-50 animate-pulse">
                                    <p className="text-xs font-medium text-neutral-400">
                                      {isRefreshingRate ? "Refreshing rate..." : "Loading..."}
                                    </p>
                                  </div>
                                ) : (
                                  <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                      `web+stellar:pay?destination=${encodeURIComponent(
                                        qrDestination
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
                                    className={cn(disabled ? "size-[130px]" : "size-[200px]")}
                                  />
                                )}
                              </div>
                              <div className="mt-3 text-center text-xs font-medium text-neutral-500">
                                <span>Waiting for payment...</span>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <p className={cn("font-medium text-neutral-900", disabled ? "text-[10px]" : "text-sm")}>Address</p>
                                  <p className={cn("break-all font-mono text-neutral-500", disabled ? "text-xs" : "text-sm")}>
                                    {qrDestination}
                                  </p>
                                </div>
                                <CopyButton
                                  value={qrDestination}
                                  className={cn("shrink-0", (disabled || isRefreshingRate) && "pointer-events-none opacity-50")}
                                />
                              </div>

                              <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className={cn("font-medium text-neutral-900", disabled ? "text-[10px]" : "text-sm")}>Memo</p>
                                    <span className="text-red-500 font-semibold text-[9px] uppercase tracking-wider">(Required)</span>
                                    <InfoTooltip content="You must include this memo in your transaction or your funds will be lost." />
                                  </div>
                                  <p className={cn("truncate font-mono text-neutral-500", disabled ? "text-xs" : "text-sm")}>{data.payment.memo}</p>
                                </div>
                                <CopyButton
                                  value={data.payment.memo ?? ""}
                                  className={cn("shrink-0", (disabled || isRefreshingRate) && "pointer-events-none opacity-50")}
                                />
                              </div>

                              <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-3">
                                <div className="min-w-0">
                                  <p className={cn("font-medium text-neutral-900", disabled ? "text-[10px]" : "text-sm")}>Amount</p>
                                  <p className={cn("truncate font-mono text-neutral-500", disabled ? "text-xs" : "text-sm")}>{formatTokenWithAsset(displayAmount, displayAsset)}</p>
                                </div>
                                <CopyButton
                                  value={displayAmount}
                                  className={cn("shrink-0", (disabled || isRefreshingRate) && "pointer-events-none opacity-50")}
                                />
                              </div>
                            </div>
                          </>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="wallet"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          {address ? (
                            <ConnectedWallet
                              address={address}
                              networkLabel={
                                data.payment.environment === "production" ? "Public" : "Testnet"
                              }
                              className="border-neutral-200 bg-neutral-50 px-3 py-3"
                            />
                          ) : null}

                          {pendingTxHash ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className={cn("w-full", disabled ? "h-8 text-xs rounded-lg" : "h-10")}
                              text="Retry payment confirmation"
                              loading={isPaying}
                              disabled={disabled || isRefreshingRate}
                              onClick={disabled ? undefined : onRetryConfirm}
                            />
                          ) : null}

                          {!address ? (
                            <Button
                              type="button"
                              className={cn("w-full", disabled ? "h-8 text-xs rounded-lg" : "h-10")}
                              text="Connect wallet"
                              loading={isConnecting}
                              disabled={disabled || paymentBlocked || isRefreshingRate}
                              onClick={disabled ? undefined : onConnectWallet}
                            />
                          ) : (
                            <Button
                              type="button"
                              className={cn("w-full", disabled ? "h-8 text-xs rounded-lg" : "h-10")}
                              text={`Pay ${formatTokenWithAsset(displayAmount, displayAsset)}`}
                              loading={isPaying || isRefreshingRate}
                              disabled={disabled || paymentBlocked || isRefreshingRate}
                              onClick={disabled ? undefined : onPay}
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Powered by Payoes Watermark */}
            <div className={cn("mt-auto text-center", disabled ? "pb-3" : "pb-6")}>
              <a
                href="https://payoes.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <span>Powered by</span>
                <img src="/logo.svg" alt="Payoes logo" className="h-4 w-auto brightness-90" />
                <span className="font-semibold text-neutral-500">Payoes</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
