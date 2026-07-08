"use client";

import { useState } from "react";
import { PaymentLinkPageContent } from "@/components/payment-links/payment-link-page-content";
import { Button } from "@/components/ui/button";
import type { PaymentLinkPresentation } from "@/lib/payment-links/types";
import { cn } from "@/lib/utils";

export function PaymentLinkPreviewPanel({
  presentation,
  environment,
}: {
  presentation: PaymentLinkPresentation;
  environment: "sandbox" | "production";
}) {
  const [previewHidden, setPreviewHidden] = useState(false);

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
            {environment === "production" ? "Production payment link" : "Test payment link"}
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

      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto p-4",
          environment === "sandbox" &&
            "bg-[repeating-linear-gradient(-45deg,transparent,transparent_8px,rgba(0,0,0,0.02)_8px,rgba(0,0,0,0.02)_16px)]"
        )}
      >
        <PaymentLinkPageContent
          organization={presentation.organization}
          environment={environment}
          currencyCode={presentation.currencyCode}
          amount={presentation.amount}
          items={presentation.items}
          description={presentation.description}
          customerCollection={presentation.customerCollection}
          preview
        />
      </div>
    </div>
  );
}
