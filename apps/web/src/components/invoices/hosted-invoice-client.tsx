"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { formatInvoiceAmount } from "@/lib/invoices/amount";
import type { InvoicePresentation } from "@/lib/invoices/presentation";
import { CheckCircle2Icon } from "lucide-react";

type HostedInvoiceData = {
  invoice: {
    id: string;
    status: string;
    amount: string;
    asset: string;
    description: string | null;
    due_at: string | null;
    paid_at: string | null;
    invoice_number: string;
  };
  presentation: InvoicePresentation;
  checkout_url: string | null;
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

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
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
          ) : data.checkout_url ? (
            <Link
              href={data.checkout_url}
              target="_blank"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Pay {formatInvoiceAmount(data.invoice.amount, data.invoice.asset)}
            </Link>
          ) : null}
        </div>

        <InvoiceDocument presentation={data.presentation} />
      </div>
    </div>
  );
}
