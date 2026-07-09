import { cn } from "@dub/utils";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export const formControlClassName =
  "w-full rounded-md border border-neutral-300 text-neutral-900 placeholder-neutral-400 read-only:bg-neutral-100 read-only:text-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm transition-all duration-150 ease-out";

export function FormFieldErrorIcon({
  visible,
  align = "center",
}: {
  visible: boolean;
  align?: "center" | "top";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 overflow-hidden transition-all duration-150 ease-out",
        align === "top" ? "items-start pt-2.5" : "items-center",
        visible ? "ml-2 w-5 opacity-100" : "ml-0 w-0 opacity-0",
      )}
      aria-hidden={!visible}
    >
      <AlertCircle
        className="size-5 shrink-0 text-white"
        fill="#ef4444"
        aria-hidden="true"
      />
    </div>
  );
}

export function FormFieldErrorMessage({ children }: { children: ReactNode }) {
  return (
    <span
      className="mt-2 block text-sm text-red-500"
      role="alert"
      aria-live="assertive"
    >
      {children}
    </span>
  );
}
