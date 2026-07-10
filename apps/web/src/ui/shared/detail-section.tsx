import type { ReactNode } from "react";
import { cn } from "@dub/utils";

export function DetailSection({
  title,
  description,
  children,
  contentClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
      <div className="border-border-subtle border-b px-4 py-3">
        <h2 className="text-content-emphasis text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "border-border-subtle -mx-px -mb-px rounded-xl border bg-white",
          contentClassName ?? "p-4",
        )}
      >
        {children}
      </div>
    </div>
  );
}
