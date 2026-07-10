import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";

const tableClassName =
  "group/table w-full border-separate border-spacing-0 text-sm [&_tr:last-child>td]:border-b-transparent [&_tr>*:first-child]:border-l-transparent [&_tr>*:last-child]:border-r-transparent";

const thClassName =
  "border-border-subtle border-b border-l-0 px-4 py-2.5 text-left text-sm font-medium text-neutral-900";

const tdClassName = "border-border-subtle border-b border-l-0 px-4 py-2.5";

export function CustomerPaymentsTableSkeleton({
  rowCount = 5,
}: {
  rowCount?: number;
}) {
  return (
    <div aria-busy="true" aria-label="Loading payments">
      <table className={tableClassName}>
        <thead>
          <tr>
            {["Payment", "Amount", "Status", "Payer", "Created"].map(
              (header) => (
                <th key={header} className={thClassName}>
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
                <SmoothSkeleton className="h-4 w-28 font-mono" />
              </td>
              <td className={tdClassName}>
                <SmoothSkeleton className="h-4 w-20" />
              </td>
              <td className={tdClassName}>
                <SmoothSkeleton className="h-6 w-20 rounded-md" />
              </td>
              <td className={tdClassName}>
                <SmoothSkeleton className="h-4 w-24 font-mono" />
              </td>
              <td className={tdClassName}>
                <SmoothSkeleton className="h-4 w-32" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
