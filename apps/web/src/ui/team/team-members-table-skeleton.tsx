import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { cn } from "@dub/utils";

const tableClassName =
  "group/table w-full border-separate border-spacing-0 text-sm [&_tr:last-child>td]:border-b-transparent [&_tr>*:first-child]:border-l-transparent [&_tr>*:last-child]:border-r-transparent";

const thClassName =
  "border-border-subtle border-b border-l-0 px-4 py-2.5 text-left text-sm font-medium text-neutral-900";

const tdClassName = "border-border-subtle border-b border-l-0 px-4 py-2.5";

const rowWidths = ["w-28", "w-16", "w-20", "w-24", "w-10"];

export function TeamMembersTableSkeleton({ rowCount = 6 }: { rowCount?: number }) {
  return (
    <div
      className="border-border-subtle bg-bg-default relative z-0 rounded-xl border"
      aria-busy="true"
      aria-label="Loading team members"
    >
      <div className="relative min-h-[320px] overflow-x-auto rounded-[inherit]">
        <table className={tableClassName}>
          <thead>
            <tr>
              {["Name", "Role", "Status", "Joined", ""].map((header) => (
                <th key={header || "menu"} className={thClassName}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, index) => (
              <tr key={index} className="group/row">
                <td className={tdClassName}>
                  <div className="flex items-center gap-3">
                    <SmoothSkeleton className="size-8 shrink-0 rounded-full" />
                    <div className="space-y-1.5">
                      <SmoothSkeleton
                        className={cn("h-4", rowWidths[index % rowWidths.length])}
                      />
                      <SmoothSkeleton className="h-3 w-32" />
                    </div>
                  </div>
                </td>
                <td className={tdClassName}>
                  <SmoothSkeleton className="h-4 w-16" />
                </td>
                <td className={tdClassName}>
                  <SmoothSkeleton className="h-5 w-20 rounded-md" />
                </td>
                <td className={tdClassName}>
                  <SmoothSkeleton className="h-4 w-24" />
                </td>
                <td className={cn(tdClassName, "w-10 px-1")} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
