import { cn } from "@dub/utils";

export function SmoothSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-200", className)}
      aria-hidden
    />
  );
}
