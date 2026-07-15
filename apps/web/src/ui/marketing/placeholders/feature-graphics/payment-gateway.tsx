"use client";

import { useMemo, useState } from "react";
import { CheckoutView } from "@/components/checkout/checkout-view";
import type { CheckoutData } from "@/components/checkout/checkout-types";
import { getPaymentLinkCheckoutPreviewUrl } from "@/lib/payment-links/preview-url";
import { DEFAULT_PAYMENT_LINK_CUSTOMER_COLLECTION } from "@/lib/payment-links/types";
import { BrowserPreviewFrame } from "@/ui/invoices/browser-preview-frame";

const DEMO_ALLOWED_ASSETS = [
  {
    asset_code: "USDC",
    issuer_address:
      "GBBD47IF6LWK7P7MDEVFA4DJ7ZTLZ5SSSU3PG3TK23OJZ7CTYYIB6W2U",
  },
  { asset_code: "XLM", issuer_address: null },
] as const;

const DEMO_AMOUNT = "49.00";

export function PaymentGateway() {
  const [paymentMode, setPaymentMode] = useState<"wallet" | "qr">("wallet");
  const [isMobileItemsOpen, setIsMobileItemsOpen] = useState(false);
  const [selectedPaidAssetKey, setSelectedPaidAssetKey] = useState(
    "USDC:GBBD47IF6LWK7P7MDEVFA4DJ7ZTLZ5SSSU3PG3TK23OJZ7CTYYIB6W2U",
  );
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);

  const mockCheckoutData = useMemo<CheckoutData>(() => {
    const selectedPaidAsset =
      DEMO_ALLOWED_ASSETS.find(
        (asset) =>
          `${asset.asset_code}:${asset.issuer_address ?? ""}` ===
          selectedPaidAssetKey,
      ) ?? DEMO_ALLOWED_ASSETS[0];

    return {
      payment: {
        id: "pay_demo",
        amount: DEMO_AMOUNT,
        settlement_asset: DEMO_ALLOWED_ASSETS[0],
        allowed_assets: [...DEMO_ALLOWED_ASSETS],
        paid_asset: selectedPaidAsset,
        status: "pending",
        description: "Pro plan subscription",
        environment: "sandbox",
        expires_at: null,
        quote_expires_at: null,
        pricing_currency: "USD",
        pricing_amount: DEMO_AMOUNT,
        quoted_paid_amount: DEMO_AMOUNT,
        quoted_settlement_amount: DEMO_AMOUNT,
        quote_rate: "1.0000000",
        settlement_quote_rate: "1.0000000",
        source_type: "payment_link",
        receiving_address: "G...",
        deposit_address: null,
        memo: "DEMO",
        payment_flow: "escrow",
      },
      items: [
        {
          description: "Pro plan (monthly)",
          quantity: "1",
          unit_amount: DEMO_AMOUNT,
          line_amount: DEMO_AMOUNT,
        },
      ],
      merchant: {
        name: "Acme Co",
        logoUrl: null,
        logoInitials: "AC",
      },
      customer_collection: DEFAULT_PAYMENT_LINK_CUSTOMER_COLLECTION,
    };
  }, [selectedPaidAssetKey]);

  const allowedAssets = mockCheckoutData.payment.allowed_assets;
  const selectedPaidAsset = mockCheckoutData.payment.paid_asset;

  return (
    <div
      className="flex size-full items-start justify-center overflow-hidden [mask-image:linear-gradient(black_55%,transparent)]"
      aria-hidden
    >
      <div className="origin-top scale-[0.72] sm:scale-[0.80]">
        <BrowserPreviewFrame
          url={getPaymentLinkCheckoutPreviewUrl()}
          className="w-[400px]"
        >
          <CheckoutView
            data={mockCheckoutData}
            isCompleted={false}
            isSessionExpired={false}
            lastAttemptError={null}
            qrDestination="G..."
            settlementLabel="USDC"
            isSandbox
            sourceLabel="Payment link"
            currencyCode="USD"
            hasPricing={false}
            showQuoteAmountLoading={false}
            displayAmount={DEMO_AMOUNT}
            displayAsset={selectedPaidAsset?.asset_code ?? "USDC"}
            quote={null}
            rateLockLabel="Rate locked"
            isRefreshingRate={false}
            isSimulating={false}
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
            disabled
            countdown="02:45"
          />
        </BrowserPreviewFrame>
      </div>
    </div>
  );
}
