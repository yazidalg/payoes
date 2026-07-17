"use client";

import { useBusinessVerification } from "@/ui/layout/business-verification-context";
import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useSwitchToProduction() {
  const router = useRouter();
  const { activeOrganization } = useDashboardShell();
  const { isVerified, isLoading } = useBusinessVerification();

  const switchToProduction = useCallback(() => {
    if (isLoading) {
      return;
    }

    if (activeOrganization.environment === "production") {
      router.push("/verification/settlement-wallet");
      return;
    }

    router.push(
      isVerified ? "/verification/settlement-wallet" : "/verification/identity",
    );
  }, [activeOrganization.environment, isLoading, isVerified, router]);

  return {
    switchToProduction,
    isVerified,
    isLoading,
  };
}
