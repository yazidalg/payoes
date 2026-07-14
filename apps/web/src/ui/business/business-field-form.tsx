"use client";

import { cn } from "@dub/utils";
import { ReactNode, useMemo, useState } from "react";
import { Button } from "@dub/ui";

type BusinessFieldFormProps = {
  title: string;
  description: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  helpText?: string | ReactNode;
  buttonText?: string;
  disabledTooltip?: string | ReactNode;
  multiline?: boolean;
  maxLength?: number;
  handleSubmit: (data: Record<string, string>) => Promise<void>;
};

export function BusinessFieldForm({
  title,
  description,
  name,
  defaultValue,
  placeholder,
  helpText,
  buttonText = "Save Changes",
  disabledTooltip,
  multiline = false,
  maxLength,
  handleSubmit,
}: BusinessFieldFormProps) {
  const [value, setValue] = useState(defaultValue);
  const [saving, setSaving] = useState(false);

  const saveDisabled = useMemo(() => {
    return saving || value === defaultValue;
  }, [saving, value, defaultValue]);

  const fieldClassName = cn(
    "w-full max-w-md rounded-md border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
    {
      "cursor-not-allowed bg-neutral-100 text-neutral-400": disabledTooltip,
    },
  );

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
          await handleSubmit({ [name]: value });
        } finally {
          setSaving(false);
        }
      }}
      className="rounded-xl border border-neutral-200 bg-white"
    >
      <div className="relative flex flex-col space-y-6 p-6">
        <div className="flex flex-col space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>

        {multiline ? (
          <textarea
            name={name}
            value={value}
            rows={4}
            maxLength={maxLength}
            placeholder={placeholder}
            disabled={Boolean(disabledTooltip)}
            onChange={(event) => setValue(event.target.value)}
            className={cn(fieldClassName, "min-h-24 resize-y py-2")}
          />
        ) : (
          <input
            name={name}
            type="text"
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            disabled={Boolean(disabledTooltip)}
            onChange={(event) => setValue(event.target.value)}
            className={fieldClassName}
          />
        )}
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:py-3">
        {typeof helpText === "string" ? (
          <p
            className="prose-sm prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-neutral-700 text-neutral-500 transition-colors"
            dangerouslySetInnerHTML={{ __html: helpText || "" }}
          />
        ) : (
          helpText
        )}
        <div className="w-fit shrink-0">
          <Button
            text={buttonText}
            loading={saving}
            disabled={saveDisabled}
            disabledTooltip={disabledTooltip}
          />
        </div>
      </div>
    </form>
  );
}
