"use client";

import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useSwitchToProduction } from "@/hooks/use-switch-to-production";
import { useDashboardShell } from "./dashboard-shell-context";
import { useUpgradeBannerVisibility } from "./upgrade-banner";
import { WhiteFadeOverlay } from "@/ui/transitions/white-fade-overlay";

export const DASHBOARD_TOP_BANNER_HEIGHT = 48;

export function useEnvironmentBannerVisibility() {
  const { activeOrganization } = useDashboardShell();

  return {
    isVisible: activeOrganization.environment === "sandbox",
  };
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
  const { isVisible: isEnvironmentBannerVisible } = useEnvironmentBannerVisibility();
  const { environmentBannerOffset } = useDashboardTopBannerHeight();
  const { switchToProduction, isOverlayVisible, overlayMessage } =
    useSwitchToProduction();

  if (!isEnvironmentBannerVisible) {
    return null;
  }

  function openVerification() {
    void switchToProduction();
  }

  return (
    <>
      <div
        role="status"
        style={{ top: environmentBannerOffset }}
        className={cn(
          "fixed left-0 right-0 z-30 flex h-12 items-center justify-center border-b border-primary-foreground/10 bg-primary px-4 text-primary-foreground sm:px-6",
        )}
      >
        <div className="flex w-full max-w-screen-xl items-center justify-between gap-4">
          <p className="min-w-0 text-sm leading-snug">
            You&apos;re testing in a sandbox. Changes you make here don&apos;t
            affect real customers or payments.
          </p>
          <Button
            type="button"
            variant="secondary"
            text="Switch to production"
            className={actionButtonClassName}
            onClick={openVerification}
          />
        </div>
      </div>

      <WhiteFadeOverlay visible={isOverlayVisible} message={overlayMessage} zIndex={100} />
    </>
  );
}
