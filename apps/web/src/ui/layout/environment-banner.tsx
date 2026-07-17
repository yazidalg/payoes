"use client";

import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { ArrowRight } from "lucide-react";
import { useSwitchToProduction } from "@/hooks/use-switch-to-production";
import { useDashboardShell } from "./dashboard-shell-context";
import { useUpgradeBannerVisibility } from "./upgrade-banner";

export const DASHBOARD_TOP_BANNER_HEIGHT = 48;

/** Set to false after screenshots to restore the sandbox banner. */
const HIDE_ENVIRONMENT_BANNER_FOR_SCREENSHOTS = false;

export function useEnvironmentBannerVisibility() {
  const { activeOrganization } = useDashboardShell();

  if (HIDE_ENVIRONMENT_BANNER_FOR_SCREENSHOTS) {
    return { isVisible: false };
  }

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

const actionButtonClassName =
  "h-7 w-fit shrink-0 border-transparent bg-transparent px-0 text-sm font-semibold text-white hover:bg-transparent hover:text-white/80";

export function EnvironmentBanner() {
  const { isVisible: isEnvironmentBannerVisible } = useEnvironmentBannerVisibility();
  const { environmentBannerOffset } = useDashboardTopBannerHeight();
  const { switchToProduction, isVerified, isLoading } = useSwitchToProduction();

  if (!isEnvironmentBannerVisible) {
    return null;
  }

  const actionLabel = isVerified ? "Change to production" : "Verify your business";

  return (
    <div
      role="status"
      style={{ top: environmentBannerOffset }}
      className={cn(
        "fixed left-0 right-0 z-30 flex h-12 items-center justify-center border-b border-sandbox-banner-border bg-sandbox-banner px-4 text-sandbox-banner-foreground sm:px-6",
      )}
    >
      <div className="flex w-full max-w-screen-xl items-center justify-between gap-4">
        <p className="min-w-0 text-sm leading-snug">
          You&apos;re testing in a sandbox. Changes you make here don&apos;t
          affect real customers or payments.
        </p>
        <Button
          type="button"
          variant="outline"
          text={actionLabel}
          right={<ArrowRight className="size-4 text-white" />}
          className={actionButtonClassName}
          disabled={isLoading}
          onClick={switchToProduction}
        />
      </div>
    </div>
  );
}
