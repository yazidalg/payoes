"use client";

import { useEffect, useState } from "react";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { InvoicePaymentPanel } from "@/components/invoices/invoice-payment-panel";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import { EnvironmentBadge } from "@/components/shared/environment-badge";
import { AlertBlock } from "@/components/shared/alert-block";
import type { InvoicePresentation } from "@/lib/invoices/presentation";
import type { Organization } from "@/lib/db/schema";
import { CheckCircle2Icon } from "lucide-react";

type AllowedAsset = {
  asset_code: string;
  issuer_address: string | null;
};

type HostedInvoiceData = {
  invoice: {
    id: string;
    status: string;
    amount: string;
    currency_code: string;
    environment: Organization["environment"];
    description: string | null;
    due_at: string | null;
    paid_at: string | null;
    invoice_number: string;
    allowed_assets: AllowedAsset[];
  };
  presentation: InvoicePresentation;
  checkout_url: string | null;
  payment_id: string | null;
};

export function HostedInvoiceClient({ invoiceId }: { invoiceId: string }) {
  const [data, setData] = useState<HostedInvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const json = (await response.json()) as HostedInvoiceData & {
        error?: string;
      };

      if (!response.ok) {
        setError(json.error ?? "Invoice not found");
        setIsLoading(false);
        return;
      }

      setData({
        ...json,
        presentation: {
          ...json.presentation,
          dueAt: json.presentation.dueAt
            ? new Date(json.presentation.dueAt)
            : null,
          createdAt: new Date(json.presentation.createdAt),
        },
      });
      setIsLoading(false);
    }

    void load();
  }, [invoiceId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading invoice...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
        <AlertBlock type="error">{error ?? "Invoice not found"}</AlertBlock>
      </div>
    );
  }

  const isPaid = data.invoice.status === "paid";
  const isPayable =
    !isPaid &&
    data.invoice.status !== "void" &&
    data.invoice.status !== "expired" &&
    Boolean(data.payment_id);

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <OrganizationMark
                organization={data.presentation.organization}
                className="size-10"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{data.presentation.organization.name}</p>
                  <EnvironmentBadge environment={data.invoice.environment} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Invoice {data.invoice.invoice_number}
                </p>
              </div>
            </div>
            {isPaid ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2Icon className="size-4" />
                Paid
              </div>
            ) : null}
          </div>

          <InvoiceDocument presentation={data.presentation} />
        </div>

        {isPayable && data.payment_id ? (
          <div className="lg:sticky lg:top-10 lg:self-start">
            <InvoicePaymentPanel
              paymentId={data.payment_id}
              environment={data.invoice.environment}
              pricingAmount={data.invoice.amount}
              pricingCurrency={data.invoice.currency_code}
              allowedAssets={data.invoice.allowed_assets}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
