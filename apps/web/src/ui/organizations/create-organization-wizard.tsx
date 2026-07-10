"use client";

import type { CreateOrganizationStep } from "@/constants/organizations/create-steps";
import type { Organization } from "@/lib/db/schema";
import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { useSettlementWalletConnection } from "@/hooks/use-settlement-wallet-connection";
import { CreateOrganizationLayout } from "@/ui/organizations/create-organization-layout";
import { KycStepPage } from "@/ui/kyc/kyc-step-page";
import { SettlementWalletSetup } from "@/ui/wallet/settlement-wallet-setup";
import { ValidatedSubmitButton } from "@/ui/forms/validated-submit-button";
import { useState } from "react";
import { toast } from "sonner";

type PendingOrganizationData = {
  formData: FormData;
};

export function CreateOrganizationWizard({
  defaultEmail,
  onSuccess,
  redirectTo = "/dashboard/payments",
  showCloseButton,
  onClose,
  closeHref,
}: {
  defaultEmail?: string | null;
  onSuccess?: (organization: Organization) => void;
  redirectTo?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  closeHref?: string;
}) {
  const [currentStep, setCurrentStep] =
    useState<CreateOrganizationStep>("organization");
  const [organizationComplete, setOrganizationComplete] = useState(false);
  const [pendingOrganization, setPendingOrganization] =
    useState<PendingOrganizationData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const {
    pendingAddress,
    walletProvider,
    networkError,
    connectError,
    isConnecting,
    isReady,
    connect,
    networkLabel,
  } = useSettlementWalletConnection("sandbox");

  async function handleOrganizationContinue(formData: FormData) {
    setPendingOrganization({ formData });
    setOrganizationComplete(true);
    setCurrentStep("settlement-wallet");
    setSubmitError(null);
  }

  async function handleCreateOrganization() {
    if (!pendingOrganization?.formData || !pendingAddress) {
      setSubmitError("Connect a Testnet wallet before continuing.");
      return;
    }

    setSubmitError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        body: pendingOrganization.formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        organization?: Organization;
      };

      if (!response.ok || !payload.organization) {
        setSubmitError(
          payload.error ?? "Unable to create organization. Please try again.",
        );
        setIsCreating(false);
        return;
      }

      const walletResponse = await fetch(
        `/api/organizations/${payload.organization.id}/settlement-wallet`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stellarAddress: pendingAddress,
            walletProvider,
            environment: "sandbox",
          }),
        },
      );

      const walletPayload = (await walletResponse.json()) as { error?: string };

      if (!walletResponse.ok) {
        setSubmitError(
          walletPayload.error ??
            "Organization created, but the settlement wallet could not be saved.",
        );
        setIsCreating(false);
        return;
      }

      if (onSuccess) {
        onSuccess(payload.organization);
        setIsCreating(false);
        return;
      }

      toast.success("Organization created successfully");
      window.location.assign(redirectTo);
    } catch {
      setSubmitError("Failed to create organization");
      setIsCreating(false);
    }
  }

  return (
    <CreateOrganizationLayout
      currentStep={currentStep}
      organizationComplete={organizationComplete}
      onStepChange={setCurrentStep}
      showCloseButton={showCloseButton}
      onClose={onClose}
      closeHref={closeHref}
    >
      {currentStep === "organization" ? (
        <KycStepPage
          title="Organization details"
          description="Set up your workspace name and business profile."
        >
          <CreateOrganizationForm
            defaultEmail={defaultEmail}
            submitLabel="Continue"
            onStepComplete={handleOrganizationContinue}
          />
        </KycStepPage>
      ) : (
        <KycStepPage
          title="Settlement wallet"
          description="Connect the Testnet wallet that receives sandbox payments."
        >
          <div className="space-y-6">
            {submitError ? (
              <p className="text-sm text-red-600">{submitError}</p>
            ) : null}

            <SettlementWalletSetup
              networkLabel={networkLabel}
              pendingAddress={pendingAddress}
              walletProvider={walletProvider}
              networkError={networkError}
              connectError={connectError}
              isConnecting={isConnecting}
              isReady={isReady}
              onConnect={connect}
            />

            <ValidatedSubmitButton
              text="Create organization"
              loading={isCreating}
              className="w-full"
              type="button"
              onClick={() => void handleCreateOrganization()}
              requiredError={
                pendingAddress ? null : "Connect a Testnet wallet to continue"
              }
              submitDisabled={!pendingAddress}
            />
          </div>
        </KycStepPage>
      )}
    </CreateOrganizationLayout>
  );
}
