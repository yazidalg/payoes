import { InfoTooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import type { ReactNode } from "react";

type SettingsSectionProps = {
  title: string;
  description: string;
  titleTooltip?: string;
  children: ReactNode;
  helpText?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function SettingsSection({
  title,
  description,
  titleTooltip,
  children,
  helpText,
  action,
  className,
  bodyClassName,
}: SettingsSectionProps) {
  const hasFooter = Boolean(helpText || action);

  return (
    <section className={cn("rounded-xl border border-neutral-200 bg-white", className)}>
      <div className={cn("relative flex flex-col space-y-6 p-6", bodyClassName)}>
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold">{title}</h2>
            {titleTooltip ? <InfoTooltip content={titleTooltip} /> : null}
          </div>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
        {children}
      </div>

      {hasFooter ? (
        <div className="flex flex-col items-start justify-between gap-4 rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:py-3">
          {helpText ? (
            typeof helpText === "string" ? (
              <p className="text-sm text-neutral-500">{helpText}</p>
            ) : (
              helpText
            )
          ) : (
            <span />
          )}
          {action ? <div className="w-fit shrink-0">{action}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
