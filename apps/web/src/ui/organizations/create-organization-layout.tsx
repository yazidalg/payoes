"use client";

import { cn } from "@dub/utils";
import type { ReactNode } from "react";
import type { CreateOrganizationStep } from "@/constants/organizations/create-steps";
import { KycSidebarProvider } from "@/ui/kyc/kyc-sidebar-context";
import { FullscreenPageShell } from "@/ui/transitions/fullscreen-page-shell";
import { CreateOrganizationHeader } from "./create-organization-header";
import { CreateOrganizationSteps } from "./create-organization-steps";

export function CreateOrganizationLayout({
  children,
  currentStep,
  organizationComplete,
  onStepChange,
  showCloseButton,
  onClose,
  closeHref,
}: {
  children: ReactNode;
  currentStep: CreateOrganizationStep;
  organizationComplete: boolean;
  onStepChange: (step: CreateOrganizationStep) => void;
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
          <CreateOrganizationHeader />

          <div className="flex flex-1 lg:grid lg:grid-cols-[240px_minmax(0,1fr)_240px]">
            <CreateOrganizationSteps
              currentStep={currentStep}
              organizationComplete={organizationComplete}
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
