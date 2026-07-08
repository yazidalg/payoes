import { formatAmountWithUnit } from "@/lib/format/amount";
import type { PaymentLinkLineItem } from "@/lib/payment-links/types";

export function PaymentLinkOrderSummary({
  items,
  amount,
  currencyCode,
}: {
  items: PaymentLinkLineItem[];
  amount: string;
  currencyCode: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">Order summary</p>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.description}-${index}`}
            className="flex items-start justify-between gap-4 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium">{item.description}</p>
              <p className="text-muted-foreground">
                {item.quantity} × {formatAmountWithUnit(item.unit_amount, currencyCode)}
              </p>
            </div>
            <p className="shrink-0 font-medium">
              {formatAmountWithUnit(item.line_amount, currencyCode)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="text-2xl font-bold tracking-tight">
          {formatAmountWithUnit(amount, currencyCode)}
        </p>
      </div>
    </div>
  );
}
