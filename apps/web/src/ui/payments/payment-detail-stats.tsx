import type { PaymentRow } from "@/lib/payments/types";
import { StatusBadge } from "@dub/ui";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { cn } from "@dub/utils";
import type { CSSProperties } from "react";
import {
  formatPaidAmount,
  formatSettlementTarget,
  formatSourceType,
  getPaymentStatusVariant,
} from "./payment-formatters";

export function PaymentDetailStats({
  payment,
  isLoading = false,
}: {
  payment?: PaymentRow;
  isLoading?: boolean;
}) {
  const stats = [
    {
      label: "Customer paid",
      value: payment ? formatPaidAmount(payment) : undefined,
    },
    {
      label: "Settlement target",
      value: payment ? formatSettlementTarget(payment) : undefined,
    },
    {
      label: "Status",
      value: payment ? (
        <StatusBadge
          variant={getPaymentStatusVariant(payment.status)}
          icon={null}
        >
          {payment.status}
        </StatusBadge>
      ) : undefined,
    },
    {
      label: "Source",
      value: payment ? formatSourceType(payment.source_type) : undefined,
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
