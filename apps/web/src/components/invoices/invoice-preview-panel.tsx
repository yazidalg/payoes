"use client";

import { useEffect, useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { BrowserPreviewFrame } from "@/ui/invoices/browser-preview-frame";
import { getInvoiceCheckoutPreviewUrl } from "@/lib/invoices/preview-url";
import type { InvoicePresentation } from "@/lib/invoices/presentation";
import { cn } from "@dub/utils";
import type { CheckoutData } from "@/components/checkout/checkout-types";
import { CheckoutView } from "@/components/checkout/checkout-view";

type PreviewTab = "pdf" | "email" | "payment";

function serializePresentationForApi(presentation: InvoicePresentation) {
  return {
    ...presentation,
    dueAt: presentation.dueAt?.toISOString() ?? null,
    createdAt: presentation.createdAt.toISOString(),
  };
}

export function InvoicePreviewPanel({
  organizationId,
  presentation,
  environment,
}: {
  organizationId: string;
  presentation: InvoicePresentation;
  environment: "sandbox" | "production";
}) {
  const [tab, setTab] = useState<PreviewTab>("payment");
  const [emailHtml, setEmailHtml] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [previewOrigin, setPreviewOrigin] = useState<string | null>(null);
  
  // Responsive / Mobile preview states
  const [previewDevice, setPreviewDevice] = useState<"responsive" | "mobile">("responsive");
  const [paymentMode, setPaymentMode] = useState<"wallet" | "qr">("wallet");
  const [isMobileItemsOpen, setIsMobileItemsOpen] = useState(false);
  const [selectedPaidAssetKey, setSelectedPaidAssetKey] = useState("USDC:GBBD47IF6LWK7P7MDEVFA4DJ7ZTLZ5SSSU3PG3TK23OJZ7CTYYIB6W2U");
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);

  useEffect(() => {
    setPreviewOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let active = true;

    setEmailError(null);
    setEmailHtml(null);

    fetch(`/api/organizations/${organizationId}/invoices/preview-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        presentation: serializePresentationForApi(presentation),
      }),
    })
      .then(async (response) => {
        const data = (await response.json()) as { html?: string; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load email preview");
        }

        if (active) {
          setEmailHtml(data.html ?? null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setEmailError(
            error instanceof Error
              ? error.message
              : "Unable to load email preview",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [organizationId, presentation]);

  const checkoutPreviewUrl = useMemo(() => {
    return getInvoiceCheckoutPreviewUrl(
      presentation,
      previewOrigin ?? undefined,
    );
  }, [presentation, previewOrigin]);

  const mockCheckoutData = useMemo<CheckoutData>(() => {
    const allowedAssets = [
      { asset_code: "USDC", issuer_address: "GBBD47IF6LWK7P7MDEVFA4DJ7ZTLZ5SSSU3PG3TK23OJZ7CTYYIB6W2U" },
      { asset_code: "XLM", issuer_address: null },
    ];

    const selectedPaidAsset = allowedAssets.find(
      (asset) => `${asset.asset_code}:${asset.issuer_address ?? ""}` === selectedPaidAssetKey
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
        environment: environment,
        expires_at: null,
        quote_expires_at: null,
        pricing_currency: presentation.currencyCode || null,
        pricing_amount: presentation.amount || null,
        quoted_paid_amount: presentation.amount || null,
        quoted_settlement_amount: presentation.amount || null,
        quote_rate: "1.0000000",
        settlement_quote_rate: "1.0000000",
        source_type: "invoice",
        receiving_address: "G...",
        deposit_address: null,
        memo: "PREVIEW",
        payment_flow: "escrow" as const,
      },
      items: presentation.items.map((item) => ({
        description: item.description,
        quantity: item.quantity || "1",
        unit_amount: item.unitAmount,
        line_amount: item.lineAmount,
      })),
      merchant: {
        name: presentation.organization.name,
        logoUrl: presentation.organization.logoUrl,
        logoInitials: presentation.organization.logoInitials,
      },
      invoice: {
        invoice_number: presentation.invoiceNumber,
        status: "open",
        due_at: presentation.dueAt?.toISOString() ?? null,
        memo: presentation.description,
        customer: {
          name: presentation.customer.name,
          email: presentation.customer.email,
        },
      },
    };
  }, [presentation, environment, selectedPaidAssetKey]);

  const allowedAssets = mockCheckoutData.payment.allowed_assets;
  const selectedPaidAsset = mockCheckoutData.payment.paid_asset;
  const hasPricing = Boolean(presentation.currencyCode && presentation.currencyCode !== presentation.asset);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4">
        <p className="text-content-default text-sm font-medium">Preview</p>
        <p className="text-content-subtle text-xs">
          {environment === "production" ? "Production invoice" : "Test invoice"}
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1">
          {([
            ["payment", "Payment page"],
            ["pdf", "Invoice PDF"],
            ["email", "Email"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === value
                  ? "bg-bg-muted text-content-default"
                  : "text-content-subtle hover:text-content-default",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "payment" ? (
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
        ) : null}
      </div>

      <div className="bg-bg-preview min-h-0 flex-1 overflow-hidden rounded-lg p-3">
        {tab === "pdf" ? (
          <div className="h-full overflow-auto">
            <InvoiceDocument presentation={presentation} className="mx-auto" />
          </div>
        ) : null}

        {tab === "email" ? (
          <div className="flex h-full flex-col overflow-hidden rounded-md border border-neutral-200 bg-white">
            {emailHtml ? (
              <iframe
                title="Invoice email preview"
                srcDoc={emailHtml}
                className="h-full min-h-0 w-full flex-1 border-0"
              />
            ) : emailError ? (
              <div className="text-content-subtle flex min-h-[200px] flex-1 items-center justify-center text-sm">
                {emailError}
              </div>
            ) : (
              <div className="text-content-subtle flex min-h-[200px] flex-1 items-center justify-center text-sm">
                Loading email preview...
              </div>
            )}
          </div>
        ) : null}

        {tab === "payment" ? (
          <BrowserPreviewFrame
            url={checkoutPreviewUrl}
            className={cn(
              "h-full mx-auto transition-[width] duration-500 ease-in-out",
              previewDevice === "mobile" ? "w-[375px]" : "w-full"
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
              sourceLabel="Invoice"
              currencyCode={presentation.currencyCode ?? "USD"}
              hasPricing={hasPricing}
              showQuoteAmountLoading={false}
              displayAmount={presentation.amount}
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
              disabled={true}
              countdown="02:45"
            />
          </BrowserPreviewFrame>
        ) : null}
      </div>
    </div>
  );
}
