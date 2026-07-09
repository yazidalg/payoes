import { Label } from "@dub/ui";
import type { ReactNode } from "react";

export function FormFieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor} className="inline-flex items-center gap-0.5">
      {children}
      {required ? (
        <span className="text-red-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </Label>
  );
}
