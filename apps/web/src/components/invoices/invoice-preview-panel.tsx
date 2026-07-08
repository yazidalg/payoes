"use client";

import { useMemo, useState } from "react";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { Button } from "@/components/ui/button";
import { formatInvoiceAmount } from "@/lib/invoices/amount";
import { buildInvoiceEmailHtml } from "@/lib/invoices/presentation";
import type { InvoicePresentation } from "@/lib/invoices/presentation";
import { cn } from "@/lib/utils";

type PreviewTab = "pdf" | "email" | "payment";

export function InvoicePreviewPanel({
  presentation,
  environment,
}: {
  presentation: InvoicePresentation;
  environment: "sandbox" | "production";
}) {
  const [tab, setTab] = useState<PreviewTab>("pdf");
  const [previewHidden, setPreviewHidden] = useState(false);

  const emailHtml = useMemo(
    () => buildInvoiceEmailHtml(presentation),
    [presentation]
  );

  if (previewHidden) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8">
        <Button type="button" variant="outline" onClick={() => setPreviewHidden(false)}>
          Show preview
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border bg-muted/20">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-medium">Preview</p>
          <p className="text-xs text-muted-foreground">
            {environment === "production" ? "Production invoice" : "Test invoice"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreviewHidden(true)}
        >
          Hide preview
        </Button>
      </div>

      <div className="flex gap-1 border-b px-4 py-2">
        {([
          ["pdf", "Invoice PDF"],
          ["email", "Email"],
          ["payment", "Payment page"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tab === "pdf" ? (
          <InvoiceDocument presentation={presentation} />
        ) : null}

        {tab === "email" ? (
          <div className="overflow-hidden rounded-lg border bg-white">
            <iframe
              title="Invoice email preview"
              srcDoc={emailHtml}
              className="min-h-[720px] w-full border-0"
            />
          </div>
        ) : null}

        {tab === "payment" ? (
          <div className="mx-auto max-w-md rounded-xl border bg-background p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <OrganizationMark
                organization={presentation.organization}
                className="size-10"
              />
              <div>
                <p className="font-medium">{presentation.organization.name}</p>
                <p className="text-sm text-muted-foreground">Secure Stellar checkout</p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Amount due</p>
              <p className="mt-1 text-3xl font-semibold">
                {formatInvoiceAmount(
                  presentation.amount,
                  presentation.currencyCode ?? presentation.asset
                )}
              </p>
              {presentation.description ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {presentation.description}
                </p>
              ) : null}
            </div>

            <Button type="button" className="mt-6 w-full" disabled>
              Connect wallet and pay
            </Button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Customers complete payment on the hosted checkout page linked from
              the invoice email.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
