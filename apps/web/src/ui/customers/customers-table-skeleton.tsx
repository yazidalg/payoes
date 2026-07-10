import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { cn } from "@dub/utils";

const tableClassName =
  "group/table w-full border-separate border-spacing-0 text-sm [&_tr:last-child>td]:border-b-transparent [&_tr>*:first-child]:border-l-transparent [&_tr>*:last-child]:border-r-transparent";

const thClassName =
  "border-border-subtle border-b border-l-0 px-4 py-2.5 text-left text-sm font-medium text-neutral-900";

const tdClassName = "border-border-subtle border-b border-l-0 px-4 py-2.5";

const customerRowWidths = ["w-28", "w-36", "w-24", "w-20", "w-32", "w-24"];

export function CustomersTableSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  return (
    <div
      className="border-border-subtle bg-bg-default relative z-0 rounded-xl border"
      aria-busy="true"
      aria-label="Loading customers"
    >
      <div className="relative min-h-[400px] overflow-x-auto rounded-[inherit]">
        <table className={tableClassName}>
          <thead>
            <tr>
              {["Customer", "Email", "Wallet", "Created", "ID", ""].map(
                (header) => (
                  <th key={header || "menu"} className={thClassName}>
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, index) => (
              <tr key={index} className="group/row">
                <td className={tdClassName}>
                  <div className="flex items-center gap-2">
                    <SmoothSkeleton className="size-5 shrink-0 rounded-full" />
                    <SmoothSkeleton
                      className={cn(
                        "h-4",
                        customerRowWidths[index % customerRowWidths.length],
                      )}
                    />
                  </div>
                </td>
                <td className={tdClassName}>
                  <SmoothSkeleton className="h-4 w-36" />
                </td>
                <td className={tdClassName}>
                  <SmoothSkeleton className="h-4 w-28 font-mono" />
                </td>
                <td className={tdClassName}>
                  <SmoothSkeleton className="h-4 w-16" />
                </td>
                <td className={tdClassName}>
                  <SmoothSkeleton className="h-4 w-24 font-mono" />
                </td>
                <td className={cn(tdClassName, "w-10 px-1")}>
                  <SmoothSkeleton className="mx-auto size-8 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
