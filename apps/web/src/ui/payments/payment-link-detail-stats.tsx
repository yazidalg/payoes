import type { PaymentLinkRow } from "@/lib/payments/types";
import { StatusBadge } from "@dub/ui";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { cn } from "@dub/utils";
import type { CSSProperties } from "react";
import {
  formatPaymentLinkAmount,
  getPaymentLinkStatusVariant,
} from "./payment-formatters";

export function PaymentLinkDetailStats({
  link,
  isLoading = false,
}: {
  link?: PaymentLinkRow;
  isLoading?: boolean;
}) {
  const productCount = link?.items?.length ?? 0;

  const stats = [
    {
      label: "Total",
      value: link ? formatPaymentLinkAmount(link) : undefined,
    },
    {
      label: "Status",
      value: link ? (
        <StatusBadge variant={getPaymentLinkStatusVariant(link.active)} icon={null}>
          {link.active ? "Active" : "Inactive"}
        </StatusBadge>
      ) : undefined,
    },
    {
      label: "Environment",
      value: link ? <span className="capitalize">{link.environment}</span> : undefined,
    },
    {
      label: "Products",
      value: link
        ? productCount > 0
          ? `${productCount} product${productCount === 1 ? "" : "s"}`
          : (link.product_name ?? "-")
        : undefined,
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
