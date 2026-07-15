import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { TeamMembersTableSkeleton } from "@/ui/team/team-members-table-skeleton";
import { cn } from "@dub/utils";

function GenericTableSkeleton({
  rowCount = 8,
  columnCount = 6,
  className,
}: {
  rowCount?: number;
  columnCount?: number;
  className?: string;
}) {
  const rowWidths = ["w-28", "w-24", "w-32", "w-20", "w-28", "w-24", "w-20"];

  return (
    <div
      className={cn(
        "border-border-subtle bg-bg-default relative z-0 overflow-hidden rounded-xl border",
        className,
      )}
    >
      <div className="border-border-subtle flex gap-4 border-b px-4 py-3">
        {Array.from({ length: columnCount }).map((_, index) => (
          <SmoothSkeleton key={index} className="h-4 w-20" />
        ))}
      </div>
      <div className="divide-y divide-neutral-200">
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columnCount }).map((_, columnIndex) => (
              <SmoothSkeleton
                key={columnIndex}
                className={cn("h-4", rowWidths[(rowIndex + columnIndex) % rowWidths.length])}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SmoothSkeleton className="h-9 w-full max-w-sm" />
      <div className="flex items-center gap-2">
        <SmoothSkeleton className="h-9 w-24" />
        <SmoothSkeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

export function DashboardTablePageLoading() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Loading page"
    >
      <DashboardToolbarSkeleton />
      <GenericTableSkeleton />
    </div>
  );
}

export function DashboardPaymentsPageLoading() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Loading payments"
    >
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SmoothSkeleton key={index} className="h-9 w-32 rounded-lg" />
        ))}
      </div>
      <DashboardToolbarSkeleton />
      <GenericTableSkeleton columnCount={7} />
    </div>
  );
}

export function DashboardAnalyticsPageLoading() {
  return (
    <div
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label="Loading analytics"
    >
      <SmoothSkeleton className="h-10 w-full max-w-xs" />
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 bg-white p-4">
            <SmoothSkeleton className="h-3 w-20" />
            <SmoothSkeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <SmoothSkeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

function SettingsFormSectionSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-col space-y-6 p-6">
        <div className="flex flex-col space-y-2">
          <SmoothSkeleton className="h-5 w-36" />
          <SmoothSkeleton className="h-4 w-full max-w-md" />
        </div>
        <SmoothSkeleton className="h-9 w-full max-w-md" />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-5 py-3">
        <SmoothSkeleton className="h-4 w-32" />
        <SmoothSkeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

export function DashboardSettingsPageLoading() {
  return (
    <div
      className="mb-6 space-y-6"
      aria-busy="true"
      aria-label="Loading settings"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <SettingsFormSectionSkeleton key={index} />
      ))}
    </div>
  );
}

export function DashboardSettingsTeamPageLoading() {
  return (
    <div
      className="mb-6"
      aria-busy="true"
      aria-label="Loading team members"
    >
      <TeamMembersTableSkeleton />
    </div>
  );
}
