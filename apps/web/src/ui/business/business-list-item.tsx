"use client";

import { BusinessMark } from "@/components/business/business-mark";
import type { Organization } from "@/lib/db/schema";
import { Check2 } from "@dub/ui/icons";
import { cn } from "@dub/utils";

export function BusinessListItem({
  organization,
  isActive,
  disabled,
  onSelect,
  className,
}: {
  organization: Organization;
  isActive: boolean;
  disabled?: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-all duration-75",
        "hover:bg-neutral-200/50 active:bg-neutral-200/80",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        isActive && "bg-neutral-200/50",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <div className="flex size-6 shrink-0 overflow-hidden rounded-full">
        <BusinessMark organization={organization} className="size-full" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-neutral-900">
          {organization.name}
        </p>
        <p className="truncate text-xs capitalize text-neutral-500">
          {organization.environment}
        </p>
      </div>
      {isActive ? (
        <Check2 className="size-4 shrink-0 text-neutral-900" aria-hidden="true" />
      ) : null}
    </button>
  );
}
