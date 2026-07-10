"use client";

import { cn } from "@dub/utils";
import type { ReactNode } from "react";
import { FullscreenPageShell } from "@/ui/transitions/fullscreen-page-shell";
import { KycSidebarProvider } from "./kyc-sidebar-context";
import { KycVerificationHeader } from "./kyc-verification-header";
import { KycVerificationSteps } from "./kyc-verification-steps";

export function KycVerificationLayout({
  children,
  identityComplete,
  goLiveComplete,
  walletComplete,
}: {
  children: ReactNode;
  identityComplete: boolean;
  goLiveComplete: boolean;
  walletComplete: boolean;
}) {
  return (
    <KycSidebarProvider>
      <FullscreenPageShell
        closeHref="/dashboard/payments"
        mode="page"
        contentClassName="min-h-0 flex-1"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <KycVerificationHeader />

          <div className="flex flex-1 lg:grid lg:grid-cols-[240px_minmax(0,1fr)_240px]">
            <KycVerificationSteps
              identityComplete={identityComplete}
              goLiveComplete={goLiveComplete}
              walletComplete={walletComplete}
            />
            <main
              className={cn(
                "flex w-full justify-center px-4 py-6 lg:px-8 lg:py-8",
              )}
            >
              {children}
            </main>
            <div className="hidden lg:block" aria-hidden />
          </div>
        </div>
      </FullscreenPageShell>
    </KycSidebarProvider>
  );
}
