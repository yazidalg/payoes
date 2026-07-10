"use client";

import { TooltipProvider } from "@dub/ui";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        {children}
        <Toaster className="pointer-events-auto" position="bottom-center" />
      </TooltipProvider>
    </SessionProvider>
  );
}
