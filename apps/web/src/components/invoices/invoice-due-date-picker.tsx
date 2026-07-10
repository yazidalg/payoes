"use client";

import { DatePicker } from "@dub/ui";
import { cn } from "@dub/utils";
import { startOfDay } from "date-fns";
import {
  FormFieldErrorIcon,
  FormFieldErrorMessage,
} from "@/ui/forms/form-field-error";

function endOfLocalDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

export function InvoiceDueDatePicker({
  value,
  onChange,
  className,
  allowPast = false,
  error,
  id,
}: {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
  allowPast?: boolean;
  error?: string;
  id?: string;
}) {
  const hasError = Boolean(error);
  const minSelectableDate = startOfDay(new Date());

  return (
    <div className={cn("w-full", className)}>
      <div className="flex w-full items-center">
        <DatePicker
          id={id}
          value={value}
          placeholder="Select due date"
          className="w-full"
          hasError={hasError}
          aria-invalid={hasError || undefined}
          fromDate={allowPast ? undefined : minSelectableDate}
          disabledDays={allowPast ? undefined : { before: minSelectableDate }}
          onChange={(date) => {
            if (!date) {
              return;
            }

            onChange(endOfLocalDay(date));
          }}
        />
        <FormFieldErrorIcon visible={hasError} />
      </div>
      {error ? <FormFieldErrorMessage>{error}</FormFieldErrorMessage> : null}
    </div>
  );
}
