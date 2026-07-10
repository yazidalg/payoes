"use client";

import { useEffect, useMemo, useState } from "react";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { BrowserPreviewFrame } from "@/ui/invoices/browser-preview-frame";
import { Button } from "@dub/ui";
import { formatInvoiceAmount } from "@/lib/invoices/amount";
import { getInvoiceCheckoutPreviewUrl } from "@/lib/invoices/preview-url";
import type { InvoicePresentation } from "@/lib/invoices/presentation";
import { cn } from "@dub/utils";

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4">
        <p className="text-content-default text-sm font-medium">Preview</p>
        <p className="text-content-subtle text-xs">
          {environment === "production" ? "Production invoice" : "Test invoice"}
        </p>
      </div>

      <div className="mb-4 flex gap-1">
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
          <BrowserPreviewFrame url={checkoutPreviewUrl} className="h-full">
            <div className="mx-auto flex min-h-full max-w-md flex-col p-6">
              <div className="flex items-center gap-3">
                <OrganizationMark
                  organization={presentation.organization}
                  className="size-10"
                />
                <div>
                  <p className="text-content-default font-medium">
                    {presentation.organization.name}
                  </p>
                  <p className="text-content-subtle text-sm">
                    Secure Stellar checkout
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-content-subtle text-sm">Amount due</p>
                <p className="text-content-default mt-1 text-3xl font-semibold">
                  {formatInvoiceAmount(
                    presentation.amount,
                    presentation.currencyCode ?? presentation.asset,
                  )}
                </p>
                {presentation.description ? (
                  <p className="text-content-subtle mt-2 text-sm">
                    {presentation.description}
                  </p>
                ) : null}
              </div>

              <Button
                type="button"
                text="Connect wallet and pay"
                className="mt-6 w-full"
                disabled
              />

              <p className="text-content-subtle mt-3 text-center text-xs">
                Customers complete payment on the hosted checkout page linked
                from the invoice email.
              </p>
            </div>
          </BrowserPreviewFrame>
        ) : null}
      </div>
    </div>
  );
}
