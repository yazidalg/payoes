import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";

export function WebhookDeliveriesSkeleton({ rowCount = 6 }: { rowCount?: number }) {
  return (
    <div
      className="overflow-hidden rounded-md border border-neutral-200"
      aria-busy="true"
      aria-label="Loading webhook deliveries"
    >
      <div className="flex flex-col divide-y divide-neutral-200">
        {Array.from({ length: rowCount }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-5 px-3.5 py-3"
          >
            <div className="flex items-center gap-5">
              <SmoothSkeleton className="size-4 rounded-full" />
              <SmoothSkeleton className="h-4 w-10" />
              <SmoothSkeleton className="h-4 w-28" />
            </div>
            <SmoothSkeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
