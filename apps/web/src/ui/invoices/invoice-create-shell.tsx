"use client";

import { FullscreenPageShell } from "@/ui/transitions/fullscreen-page-shell";
import type { ReactNode } from "react";

export function InvoiceCreateShell({
  children,
  closeHref = "/dashboard/payments?tab=invoices",
}: {
  children: ReactNode;
  closeHref?: string;
}) {
  return (
    <FullscreenPageShell
      closeHref={closeHref}
      mode="overlay"
      contentClassName="min-h-0 flex-1"
    >
      {children}
    </FullscreenPageShell>
  );
}
