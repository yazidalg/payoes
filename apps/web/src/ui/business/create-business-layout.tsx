"use client";

import { cn } from "@dub/utils";
import type { ReactNode } from "react";
import type { CreateBusinessStep } from "@/constants/business/create-steps";
import { KycSidebarProvider } from "@/ui/kyc/kyc-sidebar-context";
import { FullscreenPageShell } from "@/ui/transitions/fullscreen-page-shell";
import { CreateBusinessHeader } from "./create-business-header";
import { CreateBusinessSteps } from "./create-business-steps";

export function CreateBusinessLayout({
  children,
  currentStep,
  businessComplete,
  onStepChange,
  showCloseButton,
  onClose,
  closeHref,
}: {
  children: ReactNode;
  currentStep: CreateBusinessStep;
  businessComplete: boolean;
  onStepChange: (step: CreateBusinessStep) => void;
  showCloseButton?: boolean;
  onClose?: () => void;
  closeHref?: string;
}) {
  return (
    <KycSidebarProvider>
      <FullscreenPageShell
        showCloseButton={showCloseButton}
        onClose={onClose}
        closeHref={closeHref}
        mode="page"
        contentClassName="min-h-0 flex-1"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <CreateBusinessHeader />

          <div className="flex flex-1 lg:grid lg:grid-cols-[240px_minmax(0,1fr)_240px]">
            <CreateBusinessSteps
              currentStep={currentStep}
              businessComplete={businessComplete}
              onStepChange={onStepChange}
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
