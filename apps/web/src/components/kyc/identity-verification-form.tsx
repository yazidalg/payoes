"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "persona";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { KycStepPage } from "@/ui/kyc/kyc-step-page";
import { Button } from "@dub/ui";

type VerificationSummary = {
  organization: {
    verificationStatus: string;
  };
  application: {
    providerStatus: string;
    providerInquiryId: string | null;
  } | null;
  isExpired: boolean;
};

export function IdentityVerificationForm({
  organizationId,
  isOwner,
}: {
  organizationId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const personaClientRef = useRef<Client | null>(null);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const loadSummary = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/verification`);
    const data = (await response.json()) as VerificationSummary & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load verification status");
    }

    setSummary(data);

    if (
      data.organization.verificationStatus === "verified" &&
      !data.isExpired
    ) {
      router.replace("/verification/go-live");
    }

    return data;
  }, [organizationId, router]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setIsLoading(true);
      setError(null);

      try {
        await loadSummary();
      } catch (initError) {
        if (!cancelled) {
          setError(
            initError instanceof Error
              ? initError.message
              : "Unable to load verification status",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [loadSummary]);

  useEffect(() => {
    return () => {
      personaClientRef.current?.destroy();
      personaClientRef.current = null;
    };
  }, []);

  async function syncVerificationStatus() {
    const response = await fetch(
      `/api/organizations/${organizationId}/verification/session`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      },
    );

    const data = (await response.json()) as VerificationSummary & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to sync verification status");
    }

    setSummary(data);

    if (
      data.organization.verificationStatus === "verified" &&
      !data.isExpired
    ) {
      toast.success("Identity verified");
      router.push("/verification/go-live");
    }

    return data;
  }

  async function openPersonaFlow(inquiryId: string, sessionToken?: string | null) {
    personaClientRef.current?.destroy();

    const environmentId = process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID;

    if (!environmentId) {
      throw new Error("NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID is not configured");
    }

    const { Client: PersonaClient } = await import("persona");

    const client = new PersonaClient({
      inquiryId,
      ...(sessionToken ? { sessionToken } : {}),
      environmentId,
      onReady: () => client.open(),
      onComplete: async () => {
        try {
          await syncVerificationStatus();
          router.refresh();
        } catch (syncError) {
          setError(
            syncError instanceof Error
              ? syncError.message
              : "Unable to refresh verification status",
          );
        } finally {
          setIsOpening(false);
        }
      },
      onCancel: () => {
        setIsOpening(false);
      },
      onError: (personaError) => {
        setIsOpening(false);
        setError(personaError.message ?? "Persona verification failed");
      },
    });

    personaClientRef.current = client;
  }

  async function ensureSession() {
    const currentSummary = summary ?? (await loadSummary());

    if (!currentSummary.application?.providerInquiryId) {
      const startResponse = await fetch(`/api/organizations/${organizationId}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const startData = (await startResponse.json()) as { error?: string };

      if (!startResponse.ok) {
        throw new Error(startData.error ?? "Unable to start verification");
      }

      await loadSummary();
    }

    const sessionResponse = await fetch(
      `/api/organizations/${organizationId}/verification/session`,
      { method: "POST" },
    );
    const sessionData = (await sessionResponse.json()) as {
      error?: string;
      inquiryId?: string;
      sessionToken?: string | null;
    };

    if (!sessionResponse.ok || !sessionData.inquiryId) {
      throw new Error(sessionData.error ?? "Unable to open verification flow");
    }

    return sessionData;
  }

  async function handleOpenVerification() {
    setIsOpening(true);
    setError(null);

    try {
      const sessionData = await ensureSession();
      await openPersonaFlow(sessionData.inquiryId!, sessionData.sessionToken);
    } catch (openError) {
      setIsOpening(false);
      setError(
        openError instanceof Error
          ? openError.message
          : "Unable to open verification flow",
      );
    }
  }

  const showResume =
    summary?.application?.providerInquiryId &&
    (summary.application.providerStatus === "created" ||
      summary.application.providerStatus === "pending" ||
      summary.application.providerStatus === "needs_review") &&
    summary.organization.verificationStatus !== "verified";

  if (isLoading) {
    return (
      <KycStepPage title="Verify identity">
        <p className="text-sm text-neutral-500">Loading verification...</p>
      </KycStepPage>
    );
  }

  if (!isOwner) {
    return (
      <KycStepPage
        title="Verify identity"
        description="Only the organization owner can complete identity verification."
      >
        <AlertBlock type="info">
          Ask your organization owner to complete verification before going live.
        </AlertBlock>
      </KycStepPage>
    );
  }

  return (
    <KycStepPage
      title="Verify identity"
      description="Upload a government ID and complete a quick liveness check with Persona. This is required before accepting mainnet payments."
    >
      {error ? (
        <div className="mb-4">
          <AlertBlock type="error">{error}</AlertBlock>
        </div>
      ) : null}

      <div className="space-y-4">
        {showResume ? (
          <p className="text-sm text-neutral-500">
            You already started verification. Resume where you left off.
          </p>
        ) : null}

        <Button
          type="button"
          text={showResume ? "Resume identity verification" : "Start verification with Persona"}
          className="w-full"
          loading={isOpening}
          onClick={() => void handleOpenVerification()}
        />

        {showResume ? (
          <Button
            type="button"
            variant="secondary"
            text="Refresh status"
            className="w-full"
            onClick={() => void syncVerificationStatus()}
          />
        ) : null}
      </div>
    </KycStepPage>
  );
}
