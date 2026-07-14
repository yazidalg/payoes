"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  const continueToSettlementWallet = useCallback(() => {
    setOverlayMessage("Continue to your production settlement wallet");
    router.refresh();

    window.setTimeout(() => {
      router.push("/verification/settlement-wallet");
    }, 700);
  }, [router]);

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

        continueToSettlementWallet();
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
  }, [continueToSettlementWallet, organizationId, router]);

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
          description="We could not continue to production setup."
        >
          <p className="text-sm text-red-600">{error}</p>
        </KycStepPage>
      ) : null}
    </>
  );
}
