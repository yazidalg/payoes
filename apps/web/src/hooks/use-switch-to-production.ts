"use client";

import type { Organization } from "@/lib/db/schema";
import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type VerificationSummary = {
  organization: {
    verificationStatus: string;
    environment: string;
  };
  isExpired: boolean;
  canSwitchToProduction: boolean;
};

export type ProductionSwitchPhase = "idle" | "checking" | "switching" | "completing";

async function fetchVerificationSummary(organizationId: string) {
  const response = await fetch(`/api/organizations/${organizationId}/verification`);
  const data = (await response.json()) as VerificationSummary & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load verification status");
  }

  return data;
}

async function patchProductionEnvironment(organizationId: string) {
  const response = await fetch(`/api/organizations/${organizationId}/environment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ environment: "production" }),
  });

  const data = (await response.json()) as {
    error?: string;
    organization?: Organization;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to switch to production");
  }

  return data.organization;
}

export function useSwitchToProduction() {
  const router = useRouter();
  const { activeOrganization, setActiveOrganization } = useDashboardShell();
  const [phase, setPhase] = useState<ProductionSwitchPhase>("idle");
  const [overlayMessage, setOverlayMessage] = useState<string | undefined>();

  const switchToProduction = useCallback(async () => {
    if (phase !== "idle") {
      return;
    }

    if (activeOrganization.environment === "production") {
      return;
    }

    setPhase("checking");
    setOverlayMessage("Checking verification status...");

    try {
      const verification = await fetchVerificationSummary(activeOrganization.id);
      const isVerified =
        verification.organization.verificationStatus === "verified" &&
        !verification.isExpired;

      if (!isVerified) {
        setPhase("idle");
        setOverlayMessage(undefined);
        router.push("/verification/identity");
        return;
      }

      setPhase("switching");
      setOverlayMessage("Switching to production...");

      const organization = await patchProductionEnvironment(activeOrganization.id);

      if (organization) {
        setActiveOrganization(organization);
      }

      setPhase("completing");
      setOverlayMessage("You are now live in production");
      toast.success("Production mode enabled");
      router.refresh();

      window.setTimeout(() => {
        setPhase("idle");
        setOverlayMessage(undefined);
        router.push("/verification/settlement-wallet");
      }, 700);
    } catch (error) {
      setPhase("idle");
      setOverlayMessage(undefined);
      toast.error(
        error instanceof Error ? error.message : "Unable to switch to production",
      );
    }
  }, [activeOrganization, phase, router, setActiveOrganization]);

  return {
    switchToProduction,
    phase,
    isOverlayVisible: phase !== "idle",
    overlayMessage,
  };
}
