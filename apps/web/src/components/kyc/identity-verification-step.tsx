"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "persona";
import { ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function IdentityVerificationStep({
  organizationId,
  onVerified,
}: {
  organizationId: string;
  onVerified: () => void;
}) {
  const router = useRouter();
  const personaClientRef = useRef<Client | null>(null);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/organizations/${organizationId}/verification`);
    const data = (await response.json()) as VerificationSummary & { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to load verification status");
      setIsLoading(false);
      return;
    }

    setSummary(data);
    setIsLoading(false);

    if (
      data.organization.verificationStatus === "verified" &&
      !data.isExpired
    ) {
      onVerified();
    }
  }, [organizationId, onVerified]);

  useEffect(() => {
    void load();
  }, [load]);

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
      }
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
      onVerified();
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
              : "Unable to refresh verification status"
          );
        } finally {
          setIsVerifying(false);
        }
      },
      onCancel: () => {
        setIsVerifying(false);
      },
      onError: (personaError) => {
        setIsVerifying(false);
        setError(personaError.message ?? "Persona verification failed");
      },
    });

    personaClientRef.current = client;
  }

  async function startPersonaSession() {
    const sessionResponse = await fetch(
      `/api/organizations/${organizationId}/verification/session`,
      { method: "POST" }
    );
    const sessionData = (await sessionResponse.json()) as {
      error?: string;
      inquiryId?: string;
      sessionToken?: string | null;
    };

    if (!sessionResponse.ok || !sessionData.inquiryId) {
      throw new Error(sessionData.error ?? "Unable to open verification flow");
    }

    await openPersonaFlow(sessionData.inquiryId, sessionData.sessionToken);
  }

  async function handleStartVerification() {
    setIsSubmitting(true);
    setError(null);

    const startResponse = await fetch(`/api/organizations/${organizationId}/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_type: accountType,
        display_name: displayName,
        country,
        business_description:
          accountType === "business" ? businessDescription : undefined,
        registration_number: registrationNumber || undefined,
      }),
    });

    const startData = (await startResponse.json()) as {
      error?: string;
      details?: Record<string, string[] | undefined>;
    };

    if (!startResponse.ok) {
      const validationDetails = startData.details
        ? Object.entries(startData.details)
            .flatMap(([field, messages]) =>
              (messages ?? []).map((message) => `${field}: ${message}`)
            )
            .join(". ")
        : null;

      setError(
        [startData.error, validationDetails].filter(Boolean).join(" — ") ||
          "Unable to start verification"
      );
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsVerifying(true);

    try {
      await startPersonaSession();
      await load();
    } catch (verifyError) {
      setIsVerifying(false);
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Unable to open verification flow"
      );
    }
  }

  async function handleResumeVerification() {
    setIsVerifying(true);
    setError(null);

    try {
      await startPersonaSession();
    } catch (resumeError) {
      setIsVerifying(false);
      setError(
        resumeError instanceof Error
          ? resumeError.message
          : "Unable to resume verification"
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
    return <p className="text-sm text-muted-foreground">Loading verification...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/30 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheckIcon className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Verify with Persona</p>
          <p className="text-sm text-muted-foreground">
            Upload a government ID and complete a quick liveness check. This is
            required before accepting mainnet payments.
          </p>
        </div>
      </div>

      {error ? (
        <AlertBlock type="error" className="my-2">
          {error}
        </AlertBlock>
      ) : null}

      {showResume ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You already started verification. Resume where you left off.
          </p>
          <Button
            type="button"
            onClick={() => void handleResumeVerification()}
            isLoading={isVerifying}
            className="w-full"
          >
            Resume identity verification
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void syncVerificationStatus()}
            className="w-full"
          >
            Refresh status
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={accountType === "personal" ? "default" : "outline"}
              onClick={() => setAccountType("personal")}
            >
              Personal
            </Button>
            <Button
              type="button"
              size="sm"
              variant={accountType === "business" ? "default" : "outline"}
              onClick={() => setAccountType("business")}
            >
              Business
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="verify-display-name">Full name</Label>
              <Input
                id="verify-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-country">Country</Label>
              <Input
                id="verify-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="ID or Indonesia"
              />
            </div>
          </div>

          {accountType === "business" ? (
            <div className="space-y-2">
              <Label htmlFor="verify-business-description">What do you sell or do?</Label>
              <Input
                id="verify-business-description"
                value={businessDescription}
                onChange={(event) => setBusinessDescription(event.target.value)}
                placeholder="Freelance design, digital goods, consulting..."
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="verify-registration-number">
              Registration number (optional)
            </Label>
            <Input
              id="verify-registration-number"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(event.target.value)}
            />
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => void handleStartVerification()}
            isLoading={isSubmitting || isVerifying}
            disabled={!displayName || !country}
          >
            Start verification with Persona
          </Button>
        </div>
      )}
    </div>
  );
}
