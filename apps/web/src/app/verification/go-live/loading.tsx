import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";

export default function GoLiveLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col"
      aria-busy="true"
      aria-label="Loading production setup"
    >
      <SmoothSkeleton className="h-8 w-28" />
      <SmoothSkeleton className="mt-2 h-4 w-full max-w-sm" />
      <div className="mt-8 flex flex-col items-center gap-3 py-10">
        <SmoothSkeleton className="size-6 rounded-full" />
        <SmoothSkeleton className="h-4 w-52" />
      </div>
    </div>
  );
}
