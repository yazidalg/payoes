import type { ReactNode } from "react";
import { cn } from "@dub/utils";

export function DetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{label}</p>
      <div className={cn("mt-1 text-sm text-neutral-900", className)}>{children}</div>
    </div>
  );
}
