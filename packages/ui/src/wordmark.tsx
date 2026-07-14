import { cn } from "@dub/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-black dark:text-white", className)}>
      <img
        src="/logo.svg"
        alt="Payoes"
        className="h-6 w-auto"
      />
      <span className="font-display text-xl font-bold tracking-tight">Payoes</span>
    </div>
  );
}
