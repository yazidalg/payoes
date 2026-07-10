"use client";

import type { ReactNode } from "react";
import { formatBrowserAddressBarUrl } from "@/lib/invoices/preview-url";
import { cn } from "@dub/utils";

export function BrowserPreviewFrame({
  url,
  children,
  className,
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  const displayUrl = formatBrowserAddressBarUrl(url);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-2 py-1">
        <div className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[#FF5F57]" />
          <span className="size-1.5 rounded-full bg-[#FEBC2E]" />
          <span className="size-1.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="min-w-0 flex-1 rounded border border-neutral-200 bg-white px-2 py-0.5 text-center text-[10px] leading-4 text-neutral-500">
          <span className="block truncate">{displayUrl}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-white">{children}</div>
    </div>
  );
}
