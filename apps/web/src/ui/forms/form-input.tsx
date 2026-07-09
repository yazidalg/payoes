import { cn } from "@dub/utils";
import type { InputHTMLAttributes } from "react";
import {
  formControlClassName,
  FormFieldErrorIcon,
  FormFieldErrorMessage,
} from "./form-field-error";

export function FormInput({
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
}) {
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      <div className="flex w-full items-center">
        <input
          className={cn(
            formControlClassName,
            "h-10 min-w-0 flex-1",
            hasError &&
              "border-red-500 focus:border-red-500 focus:ring-red-500",
            className,
          )}
          aria-invalid={hasError || undefined}
          {...props}
        />
        <FormFieldErrorIcon visible={hasError} />
      </div>
      {error ? <FormFieldErrorMessage>{error}</FormFieldErrorMessage> : null}
    </div>
  );
}
