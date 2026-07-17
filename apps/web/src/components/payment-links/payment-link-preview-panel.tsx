"use client";

import { useEffect, useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { BrowserPreviewFrame } from "@/ui/invoices/browser-preview-frame";
import { getPaymentLinkCheckoutPreviewUrl } from "@/lib/payment-links/preview-url";
import type {
  PaymentLinkCustomerInput,
  PaymentLinkPresentation,
} from "@/lib/payment-links/types";
import { cn } from "@dub/utils";
import type { CheckoutData } from "@/components/checkout/checkout-types";
import { CheckoutView } from "@/components/checkout/checkout-view";

export function PaymentLinkPreviewPanel({
  presentation,
  environment,
}: {
  presentation: PaymentLinkPresentation;
  environment: "sandbox" | "production";
}) {
  const [previewOrigin, setPreviewOrigin] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"responsive" | "mobile">(
    "responsive",
  );
  const [paymentMode, setPaymentMode] = useState<"wallet" | "qr">("wallet");
  const [isMobileItemsOpen, setIsMobileItemsOpen] = useState(false);
  const [selectedPaidAssetKey, setSelectedPaidAssetKey] = useState(
    "USDC:GBBD47IF6LWK7P7MDEVFA4DJ7ZTLZ5SSSU3PG3TK23OJZ7CTYYIB6W2U",
  );
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [previewCustomerInput, setPreviewCustomerInput] =
    useState<PaymentLinkCustomerInput>({});

  useEffect(() => {
    setPreviewOrigin(window.location.origin);
  }, []);

  const checkoutPreviewUrl = useMemo(
    () => getPaymentLinkCheckoutPreviewUrl(previewOrigin ?? undefined),
    [previewOrigin],
  );

  const mockCheckoutData = useMemo<CheckoutData>(() => {
    const allowedAssets = [
      {
        asset_code: "USDC",
        issuer_address:
          "GBBD47IF6LWK7P7MDEVFA4DJ7ZTLZ5SSSU3PG3TK23OJZ7CTYYIB6W2U",
      },
      { asset_code: "XLM", issuer_address: null },
    ];

    const selectedPaidAsset =
      allowedAssets.find(
        (asset) =>
          `${asset.asset_code}:${asset.issuer_address ?? ""}` ===
          selectedPaidAssetKey,
      ) ?? allowedAssets[0]!;

    return {
      payment: {
        id: "pay_preview",
        amount: presentation.amount,
        settlement_asset: allowedAssets[0]!,
        allowed_assets: allowedAssets,
        paid_asset: selectedPaidAsset,
        status: "pending",
        description: presentation.description,
        environment,
        expires_at: null,
        quote_expires_at: null,
        pricing_currency: presentation.currencyCode || null,
        pricing_amount: presentation.amount || null,
        quoted_paid_amount: presentation.amount || null,
        quoted_settlement_amount: presentation.amount || null,
        quote_rate: "1.0000000",
        settlement_quote_rate: "1.0000000",
        source_type: "payment_link",
        receiving_address: "G...",
        deposit_address: null,
        memo: "PREVIEW",
        payment_flow: "escrow" as const,
      },
      items: presentation.items.map((item) => ({
        description: item.description,
        quantity: item.quantity || "1",
        unit_amount: item.unit_amount,
        line_amount: item.line_amount,
      })),
      merchant: {
        name: presentation.organization.name,
        logoUrl: presentation.organization.logoUrl,
        logoInitials: presentation.organization.logoInitials,
      },
      customer_collection: presentation.customerCollection,
    };
  }, [environment, presentation, selectedPaidAssetKey]);

  const allowedAssets = mockCheckoutData.payment.allowed_assets;
  const selectedPaidAsset = mockCheckoutData.payment.paid_asset;
  const hasPricing = Boolean(
    presentation.currencyCode &&
      presentation.currencyCode !==
        mockCheckoutData.payment.settlement_asset.asset_code,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4">
        <p className="text-content-default text-sm font-medium">Preview</p>
        <p className="text-content-subtle text-xs">
          {environment === "production"
            ? "Production payment link"
            : "Test payment link"}
        </p>
      </div>

      <div className="mb-4 flex items-center justify-end">
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
          <button
            type="button"
            onClick={() => setPreviewDevice("responsive")}
            className={cn(
              "rounded-md p-1 transition-all",
              previewDevice === "responsive"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-400 hover:text-neutral-600",
            )}
            title="Desktop (Responsive)"
          >
            <Monitor className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice("mobile")}
            className={cn(
              "rounded-md p-1 transition-all",
              previewDevice === "mobile"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-400 hover:text-neutral-600",
            )}
            title="Mobile"
          >
            <Smartphone className="size-4" />
          </button>
        </div>
      </div>

      <div className="bg-bg-preview min-h-0 flex-1 overflow-hidden rounded-lg p-3">
        <BrowserPreviewFrame
          url={checkoutPreviewUrl}
          className={cn(
            "mx-auto h-full transition-[width] duration-500 ease-in-out",
            previewDevice === "mobile" ? "w-[375px]" : "w-full",
          )}
        >
          <CheckoutView
            data={mockCheckoutData}
            isCompleted={false}
            isSessionExpired={false}
            lastAttemptError={null}
            qrDestination="G..."
            settlementLabel="USDC"
            isSandbox={environment === "sandbox"}
            sourceLabel="Payment link"
            currencyCode={presentation.currencyCode ?? "USD"}
            hasPricing={hasPricing}
            showQuoteAmountLoading={false}
            displayAmount={presentation.amount}
            displayAsset={selectedPaidAsset?.asset_code ?? "USDC"}
            quote={null}
            rateLockLabel="Rate locked"
            isRefreshingRate={false}
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
            address={null}
            pendingTxHash={null}
            isPaying={false}
            isConnecting={false}
            paymentBlocked={false}
            quoteError={null}
            error={null}
            networkError={null}
            connectError={null}
            showQrLoading={false}
            disabled={true}
            countdown="02:45"
            customerInput={previewCustomerInput}
            onCustomerInputChange={setPreviewCustomerInput}
          />
        </BrowserPreviewFrame>
      </div>
    </div>
  );
}
