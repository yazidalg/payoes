import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { cn } from "@dub/utils";

const tableClassName =
  "group/table w-full border-separate border-spacing-0 text-sm [&_tr:last-child>td]:border-b-transparent [&_tr>*:first-child]:border-l-transparent [&_tr>*:last-child]:border-r-transparent";

const thClassName =
  "border-border-subtle border-b border-l-0 px-4 py-2.5 text-left text-sm font-medium text-neutral-900";

const tdClassName = "border-border-subtle border-b border-l-0 px-4 py-2.5";

const rowWidths = ["w-28", "w-20", "w-24", "w-20", "w-24", "w-20", "w-24", "w-20"];

export function PaymentsTableSkeleton({
  rowCount = 8,
}: {
  rowCount?: number;
}) {
  return (
    <div
      className="border-border-subtle bg-bg-default relative z-0 rounded-xl border"
      aria-busy="true"
      aria-label="Loading payments"
    >
      <div className="relative min-h-[400px] overflow-x-auto rounded-[inherit]">
        <table className={tableClassName}>
          <thead>
            <tr>
              {[
                "Payment",
                "Paid",
                "Pricing",
                "Status",
                "Customer",
                "Source",
                "Created",
                "Expires",
                "",
              ].map((header) => (
                <th key={header || "menu"} className={thClassName}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, index) => (
              <tr key={index} className="group/row">
                {rowWidths.map((width, cellIndex) => (
                  <td key={cellIndex} className={tdClassName}>
                    <SmoothSkeleton className={cn("h-4", width)} />
                  </td>
                ))}
                <td className={cn(tdClassName, "w-10 px-1")} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
