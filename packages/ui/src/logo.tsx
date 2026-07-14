import { cn } from "@dub/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="Payoes"
      className={cn("h-10 w-10 shrink-0", className)}
    />
  );
}
