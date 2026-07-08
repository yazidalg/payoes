"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { IdentityVerificationStep } from "@/components/kyc/identity-verification-step";
import { AlertBlock } from "@/components/shared/alert-block";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type WizardStep = "verify" | "switching" | "done";

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

export function EnableProductionDialog({
  organizationId,
  open,
  onOpenChange,
  onEnvironmentChanged,
}: {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnvironmentChanged?: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("verify");
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [needsProductionWallet, setNeedsProductionWallet] = useState(false);

  const switchToProduction = useCallback(async () => {
    setStep("switching");
    setError(null);

    const response = await fetch(`/api/organizations/${organizationId}/environment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ environment: "production" }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to switch to production");
    }

    setStep("done");
    toast.success("Production mode enabled");
    router.refresh();
    onEnvironmentChanged?.();

    const walletResponse = await fetch(
      `/api/organizations/${organizationId}/receiving-wallet`
    );
    const walletData = (await walletResponse.json()) as {
      wallet?: { stellarAddress: string } | null;
    };
    const missingProductionWallet = !walletData.wallet;
    setNeedsProductionWallet(missingProductionWallet);

    window.setTimeout(() => {
      onOpenChange(false);

      if (missingProductionWallet) {
        toast.info("Set up your production receiving wallet to accept live payments.");
        router.push("/dashboard/settings/receiving-wallet");
      }
    }, 1200);
  }, [organizationId, onEnvironmentChanged, onOpenChange, router]);

  useEffect(() => {
    if (!open) {
      setStep("verify");
      setError(null);
      setIsInitializing(false);
      setNeedsProductionWallet(false);
      return;
    }

    let cancelled = false;

    async function initialize() {
      setIsInitializing(true);
      setError(null);

      try {
        const verification = await fetchVerificationSummary(organizationId);
        const isVerified =
          verification.organization.verificationStatus === "verified" &&
          !verification.isExpired;

        if (cancelled) {
          return;
        }

        if (!isVerified) {
          setStep("verify");
          return;
        }

        setStep("switching");
        await switchToProduction();
      } catch (resolveError) {
        if (cancelled) {
          return;
        }

        setError(
          resolveError instanceof Error
            ? resolveError.message
            : "Unable to prepare production mode"
        );
        setStep("verify");
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [open, organizationId, switchToProduction]);

  async function handleVerified() {
    try {
      await switchToProduction();
    } catch (verifiedError) {
      setError(
        verifiedError instanceof Error
          ? verifiedError.message
          : "Unable to switch to production"
      );
    }
  }

  const steps = [
    { id: "verify", label: "Verify identity" },
    { id: "switching", label: "Go live" },
  ] as const;

  const activeStepIndex = step === "verify" ? 0 : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enable production mode</DialogTitle>
          <DialogDescription>
            Verify your identity with Persona to accept live mainnet payments.
            You will configure a separate production receiving wallet after
            verification if one is not set yet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {steps.map((wizardStep, index) => (
            <div key={wizardStep.id} className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  index <= activeStepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index < activeStepIndex || step === "done" ? (
                  <CheckCircle2Icon className="size-4" />
                ) : (
                  index + 1
                )}
              </div>
              <p
                className={cn(
                  "truncate text-xs font-medium",
                  index <= activeStepIndex ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {wizardStep.label}
              </p>
              {index < steps.length - 1 ? (
                <div className="h-px min-w-4 flex-1 bg-border" />
              ) : null}
            </div>
          ))}
        </div>

        {error ? (
          <AlertBlock type="error" className="my-2">
            {error}
          </AlertBlock>
        ) : null}

        {isInitializing ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Preparing production setup...
          </div>
        ) : null}

        {!isInitializing && step === "verify" ? (
          <IdentityVerificationStep
            organizationId={organizationId}
            onVerified={() => void handleVerified()}
          />
        ) : null}

        {!isInitializing && (step === "switching" || step === "done") ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            {step === "switching" ? (
              <Loader2Icon className="size-8 animate-spin text-primary" />
            ) : (
              <CheckCircle2Icon className="size-8 text-emerald-600" />
            )}
            <p className="text-sm font-medium">
              {step === "switching"
                ? "Switching to production mode..."
                : "You are now live in production"}
            </p>
            <p className="text-sm text-muted-foreground">
              {step === "done"
                ? needsProductionWallet
                  ? "Next, configure your mainnet receiving wallet in Settings."
                  : "Your production receiving wallet is already configured."
                : "Hang tight while we update your workspace."}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
