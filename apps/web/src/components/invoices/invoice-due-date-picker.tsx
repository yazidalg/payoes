"use client";

import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function InvoiceDueDatePicker({
  value,
  onChange,
  className,
}: {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}) {
  const [inputValue, setInputValue] = useState(formatDateInputValue(value));

  useEffect(() => {
    setInputValue(formatDateInputValue(value));
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <CalendarIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="date"
        value={inputValue}
        min={formatDateInputValue(new Date())}
        className="pl-9"
        onChange={(event) => {
          const nextValue = event.target.value;
          setInputValue(nextValue);

          const parsed = parseDateInputValue(nextValue);

          if (parsed) {
            parsed.setHours(23, 59, 59, 999);
            onChange(parsed);
          }
        }}
      />
    </div>
  );
}
