import type { InvoiceRow } from "@/lib/payments/types";
import { StatusBadge } from "@dub/ui";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { cn } from "@dub/utils";
import type { CSSProperties } from "react";
import {
  formatInvoiceAmount,
  getInvoiceStatusVariant,
} from "./payment-formatters";

function formatDueLabel(invoice: InvoiceRow) {
  if (!invoice.due_at) {
    return "-";
  }

  return new Date(invoice.due_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvoiceDetailStats({
  invoice,
  isLoading = false,
}: {
  invoice?: InvoiceRow;
  isLoading?: boolean;
}) {
  const customerLabel =
    invoice?.customer_name ?? invoice?.customer_email ?? invoice?.customer_id ?? "-";

  const stats = [
    {
      label: "Total",
      value: invoice ? formatInvoiceAmount(invoice) : undefined,
    },
    {
      label: "Status",
      value: invoice ? (
        <StatusBadge variant={getInvoiceStatusVariant(invoice.status)} icon={null}>
          {invoice.status}
        </StatusBadge>
      ) : undefined,
    },
    {
      label: "Due",
      value: invoice ? formatDueLabel(invoice) : undefined,
    },
    {
      label: "Customer",
      value: customerLabel,
    },
  ];

  return (
    <div className="@container/stats">
      <div
        className={cn(
          "@xs/stats:grid-cols-[repeat(var(--cols),1fr)] grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200",
        )}
        style={{ "--cols": stats.length } as CSSProperties}
      >
        {stats.map(({ label, value }) => (
          <div key={label} className="flex flex-col bg-white p-3">
            <span className="text-xs text-neutral-500">{label}</span>
            {isLoading || value === undefined ? (
              <SmoothSkeleton className="mt-1 h-5 w-16" />
            ) : (
              <span className="text-content-emphasis mt-1 text-sm font-medium">
                {value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
