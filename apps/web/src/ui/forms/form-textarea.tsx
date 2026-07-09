import { cn } from "@dub/utils";
import type { TextareaHTMLAttributes } from "react";
import {
  formControlClassName,
  FormFieldErrorIcon,
  FormFieldErrorMessage,
} from "./form-field-error";

export function FormTextarea({
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
}) {
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      <div className="flex w-full items-start">
        <textarea
          className={cn(
            formControlClassName,
            "min-h-24 min-w-0 flex-1 resize-none",
            hasError &&
              "border-red-500 focus:border-red-500 focus:ring-red-500",
            className,
          )}
          aria-invalid={hasError || undefined}
          {...props}
        />
        <FormFieldErrorIcon visible={hasError} align="top" />
      </div>
      {error ? <FormFieldErrorMessage>{error}</FormFieldErrorMessage> : null}
    </div>
  );
}
