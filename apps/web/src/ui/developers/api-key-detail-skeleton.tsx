import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";

export function ApiKeyDetailSkeleton() {
  return (
    <div className="space-y-6 pb-10" aria-busy="true" aria-label="Loading API key">
      <div className="grid max-w-screen-lg gap-6">
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
          <SmoothSkeleton className="h-4 w-24" />
          <SmoothSkeleton className="h-10 w-full max-w-md" />
          <SmoothSkeleton className="h-4 w-32" />
          <SmoothSkeleton className="h-10 w-full max-w-md" />
          <SmoothSkeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <SmoothSkeleton className="h-3 w-20" />
              <SmoothSkeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
