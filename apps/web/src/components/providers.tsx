"use client";

import { TooltipProvider } from "@dub/ui";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      {children}
      <Toaster className="pointer-events-auto" position="bottom-center" />
    </TooltipProvider>
  );
}
