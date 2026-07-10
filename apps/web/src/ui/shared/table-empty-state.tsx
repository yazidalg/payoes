"use client";

import { AnimatedEmptyState } from "@dub/ui";
import { cn } from "@dub/utils";
import type { ReactNode } from "react";

export function TableEmptyState({
  title,
  description,
  icon,
  isFiltered = false,
  filteredTitle,
  filteredDescription,
  addButton,
  className,
}: {
  title: string;
  description: ReactNode;
  icon: ReactNode;
  isFiltered?: boolean;
  filteredTitle?: string;
  filteredDescription?: ReactNode;
  addButton?: ReactNode;
  className?: string;
}) {
  return (
    <AnimatedEmptyState
      title={isFiltered ? (filteredTitle ?? title.replace(/ yet$/, " found")) : title}
      description={
        isFiltered
          ? (filteredDescription ??
            "No results found for the selected filters. Adjust your filters to refine your search results.")
          : description
      }
      cardContent={() => (
        <>
          {icon}
          <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
        </>
      )}
      addButton={addButton}
      className={cn("bg-white md:min-h-[320px]", className)}
    />
  );
}
