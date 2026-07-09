"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { toast } from "sonner";
import { EnableProductionDialog } from "@/components/dashboard/enable-production-dialog";
import type { Organization } from "@/lib/db/schema";
import { useDashboardShell } from "./dashboard-shell-context";
import { useUpgradeBannerVisibility } from "./upgrade-banner";

export const DASHBOARD_TOP_BANNER_HEIGHT = 48;

export function useEnvironmentBannerVisibility() {
  return { isVisible: true };
}

export function useDashboardTopBannerHeight() {
  const { isVisible: isUpgradeBannerVisible } = useUpgradeBannerVisibility();
  const { isVisible: isEnvironmentBannerVisible } = useEnvironmentBannerVisibility();

  const height = (isUpgradeBannerVisible ? DASHBOARD_TOP_BANNER_HEIGHT : 0) + (isEnvironmentBannerVisible ? DASHBOARD_TOP_BANNER_HEIGHT : 0);

  return {
    height,
    hasTopBanner: height > 0,
    environmentBannerOffset: isUpgradeBannerVisible ? DASHBOARD_TOP_BANNER_HEIGHT : 0,
  };
}

const actionButtonClassName = "h-7 w-fit shrink-0 px-2.5 text-sm font-medium";

export function EnvironmentBanner() {
  const router = useRouter();
  const { activeOrganization, setActiveOrganization } = useDashboardShell();
  const { environmentBannerOffset } = useDashboardTopBannerHeight();

  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [sandboxDialogOpen, setSandboxDialogOpen] = useState(false);
  const [isSwitchingToSandbox, setIsSwitchingToSandbox] = useState(false);

  const isProduction = activeOrganization.environment === "production";

  async function handleSwitchToSandbox() {
    setIsSwitchingToSandbox(true);

    const response = await fetch(`/api/organizations/${activeOrganization.id}/environment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ environment: "sandbox" }),
    });

    const data = (await response.json()) as {
      error?: string;
      organization?: Organization;
    };

    setIsSwitchingToSandbox(false);

    if (!response.ok) {
      toast.error(data.error ?? "Unable to switch to sandbox");
      return;
    }

    toast.success("Switched to sandbox mode");
    setSandboxDialogOpen(false);

    if (data.organization) {
      setActiveOrganization(data.organization);
    }

    router.refresh();
  }

  function handleProductionEnabled() {
    setActiveOrganization({
      ...activeOrganization,
      environment: "production",
    });
  }

  return (
    <>
      <div role="status" style={{ top: environmentBannerOffset }} className={cn("fixed left-0 right-0 z-30 flex h-12 items-center justify-center border-b px-4 sm:px-6", isProduction ? "border-neutral-800 bg-neutral-900 text-neutral-100" : "border-blue-800 bg-blue-700 text-white")}>
        <div className="flex w-full max-w-screen-xl items-center justify-between gap-4">
          <p className="min-w-0 text-sm leading-snug">{isProduction ? "Production mode. Payments use mainnet and real funds." : "You're testing in a sandbox. Changes you make here don't affect real customers or payments."}</p>

          {isProduction ? <Button type="button" variant="secondary" text="Switch to sandbox" className={actionButtonClassName} onClick={() => setSandboxDialogOpen(true)} /> : <Button type="button" variant="secondary" text="Switch to production" className={actionButtonClassName} onClick={() => setEnableDialogOpen(true)} />}
        </div>
      </div>

      <Modal showModal={sandboxDialogOpen} setShowModal={setSandboxDialogOpen} className="max-w-md">
        <div className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-neutral-900">Switch to sandbox?</h2>
            <p className="text-sm text-neutral-500">Sandbox mode uses test data and does not affect live mainnet payments. You can switch back to production anytime after verification.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" text="Cancel" className="h-9 w-fit" onClick={() => setSandboxDialogOpen(false)} />
            <Button type="button" variant="primary" text="Switch to sandbox" loading={isSwitchingToSandbox} className="h-9 w-fit" onClick={() => void handleSwitchToSandbox()} />
          </div>
        </div>
      </Modal>

      {enableDialogOpen ? <EnableProductionDialog organizationId={activeOrganization.id} open={enableDialogOpen} onOpenChange={setEnableDialogOpen} onEnvironmentChanged={handleProductionEnabled} /> : null}
    </>
  );
}
