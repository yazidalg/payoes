import type { CustomerRow } from "@/lib/customers/types";
import { formatCustomerLabel } from "@/lib/customers/types";
import { cn } from "@dub/utils";
import { CustomerAvatar } from "./customer-avatar";

export function CustomerRowItem({
  customer,
  className,
}: {
  customer: CustomerRow;
  className?: string;
}) {
  const display = formatCustomerLabel(customer);

  return (
    <div
      className={cn("flex min-w-0 items-center gap-2 truncate", className)}
      title={display}
    >
      <CustomerAvatar
        customer={customer}
        className="size-5 border border-neutral-200"
      />
      <span className="truncate">{display}</span>
    </div>
  );
}
