import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";

export function IntegrationDetailFormSkeleton({
  fieldCount = 1,
}: {
  fieldCount?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SmoothSkeleton className="h-4 w-12" />
        <SmoothSkeleton className="h-5 w-24 rounded-full" />
      </div>

      {fieldCount > 0 ? (
        <div
          className={
            fieldCount > 1 ? "grid max-w-xl gap-4" : "max-w-md space-y-2"
          }
        >
          {Array.from({ length: fieldCount }).map((_, index) => (
            <div key={index} className="space-y-2">
              <SmoothSkeleton className="h-4 w-24" />
              <SmoothSkeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function IntegrationDetailSkeleton({
  fieldCount = 1,
}: {
  fieldCount?: number;
}) {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading integration"
    >
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col space-y-6 p-6">
          <div className="flex flex-col space-y-1">
            <SmoothSkeleton className="h-5 w-36" />
            <SmoothSkeleton className="h-4 w-full max-w-md" />
          </div>
          <IntegrationDetailFormSkeleton fieldCount={fieldCount} />
        </div>
        <div className="flex flex-col items-start justify-between gap-4 rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-3">
          <SmoothSkeleton className="h-4 w-48 max-w-full" />
          <SmoothSkeleton className="h-9 w-32 shrink-0" />
        </div>
      </div>
    </div>
  );
}
