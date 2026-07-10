"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KycStepPage } from "@/ui/kyc/kyc-step-page";
import { WhiteFadeOverlay } from "@/ui/transitions/white-fade-overlay";

type VerificationSummary = {
  organization: {
    verificationStatus: string;
  };
  isExpired: boolean;
};

async function fetchVerificationSummary(organizationId: string) {
  const response = await fetch(`/api/organizations/${organizationId}/verification`);
  const data = (await response.json()) as VerificationSummary & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load verification status");
  }

  return data;
}

export function GoLiveStep({
  organizationId,
  isOwner,
}: {
  organizationId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [overlayMessage, setOverlayMessage] = useState<string | undefined>(
    "Preparing production setup...",
  );

  const switchToProduction = useCallback(async () => {
    setOverlayMessage("Switching to production...");

    const response = await fetch(`/api/organizations/${organizationId}/environment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ environment: "production" }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to switch to production");
    }

    setOverlayMessage("You are now live in production");
    toast.success("Production mode enabled");
    router.refresh();

    window.setTimeout(() => {
      router.push("/verification/settlement-wallet");
    }, 700);
  }, [organizationId, router]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setError(null);
      setOverlayMessage("Checking verification status...");

      try {
        const verification = await fetchVerificationSummary(organizationId);
        const isVerified =
          verification.organization.verificationStatus === "verified" &&
          !verification.isExpired;

        if (cancelled) {
          return;
        }

        if (!isVerified) {
          router.replace("/verification/identity");
          return;
        }

        await switchToProduction();
      } catch (initError) {
        if (cancelled) {
          return;
        }

        setError(
          initError instanceof Error
            ? initError.message
            : "Unable to prepare production mode",
        );
        setOverlayMessage(undefined);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [organizationId, router, switchToProduction]);

  if (!isOwner) {
    return (
      <KycStepPage
        title="Go live"
        description="Only the organization owner can enable production mode."
      >
        <p className="text-sm text-neutral-500">
          Ask your organization owner to complete this step.
        </p>
      </KycStepPage>
    );
  }

  return (
    <>
      <WhiteFadeOverlay
        visible={!error}
        message={overlayMessage}
        zIndex={100}
      />

      {error ? (
        <KycStepPage
          title="Go live"
          description="We could not switch your workspace to production."
        >
          <p className="text-sm text-red-600">{error}</p>
        </KycStepPage>
      ) : null}
    </>
  );
}
