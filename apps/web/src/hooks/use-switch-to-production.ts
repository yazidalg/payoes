"use client";

import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type VerificationSummary = {
  organization: {
    verificationStatus: string;
    environment: string;
  };
  isExpired: boolean;
  canSwitchToProduction: boolean;
};

export type ProductionSwitchPhase = "idle" | "checking" | "redirecting";

async function fetchVerificationSummary(organizationId: string) {
  const response = await fetch(`/api/organizations/${organizationId}/verification`);
  const data = (await response.json()) as VerificationSummary & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load verification status");
  }

  return data;
}

export function useSwitchToProduction() {
  const router = useRouter();
  const { activeOrganization } = useDashboardShell();
  const [phase, setPhase] = useState<ProductionSwitchPhase>("idle");
  const [overlayMessage, setOverlayMessage] = useState<string | undefined>();

  const switchToProduction = useCallback(async () => {
    if (phase !== "idle") {
      return;
    }

    if (activeOrganization.environment === "production") {
      router.push("/verification/settlement-wallet");
      return;
    }

    setPhase("checking");
    setOverlayMessage("Checking verification status...");

    try {
      const verification = await fetchVerificationSummary(activeOrganization.id);
      const isVerified =
        verification.organization.verificationStatus === "verified" &&
        !verification.isExpired;

      setPhase("redirecting");
      setOverlayMessage(
        isVerified
          ? "Continue to production setup..."
          : "Continue to identity verification...",
      );

      window.setTimeout(() => {
        setPhase("idle");
        setOverlayMessage(undefined);
        router.push(
          isVerified
            ? "/verification/settlement-wallet"
            : "/verification/identity",
        );
      }, 500);
    } catch {
      setPhase("idle");
      setOverlayMessage(undefined);
      router.push("/verification/identity");
    }
  }, [activeOrganization.environment, activeOrganization.id, phase, router]);

  return {
    switchToProduction,
    phase,
    isOverlayVisible: phase !== "idle",
    overlayMessage,
  };
}
