"use client";

import type { CreateOrganizationStep } from "@/constants/organizations/create-steps";
import type { Organization } from "@/lib/db/schema";
import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { TrustlineSetupDialog } from "@/components/wallet/trustline-setup-dialog";
import { useSettlementWalletConnection } from "@/hooks/use-settlement-wallet-connection";
import { useTrustlineSetup } from "@/hooks/use-trustline-setup";
import { CreateOrganizationLayout } from "@/ui/organizations/create-organization-layout";
import { KycStepPage } from "@/ui/kyc/kyc-step-page";
import { SettlementWalletSetup } from "@/ui/wallet/settlement-wallet-setup";
import { ValidatedSubmitButton } from "@/ui/forms/validated-submit-button";
import { useState } from "react";
import { toast } from "sonner";

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
  const [pendingOrganization, setPendingOrganization] = useState<FormData | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const {
    pendingAddress,
    walletProvider,
    networkError,
    connectError,
    isConnecting,
    isReady,
    connect,
    changeWallet,
    networkLabel,
  } = useSettlementWalletConnection("sandbox");

  const {
    missingAssets,
    hasMissing: hasMissingTrustlines,
    isDialogOpen: isTrustlineDialogOpen,
    isChecking: isCheckingTrustlines,
    isAdding: isAddingTrustlines,
    error: trustlineError,
    addTrustlines,
    dismiss: dismissTrustlineDialog,
  } = useTrustlineSetup({
    useDefaultAssets: true,
    address: pendingAddress,
    environment: "sandbox",
    enabled: Boolean(pendingAddress),
    required: true,
  });

  async function handleOrganizationContinue(formData: FormData) {
    setSubmitError(null);
    setPendingOrganization(formData);
    setOrganizationComplete(true);
    setCurrentStep("settlement-wallet");
  }

  async function handleAddTrustlines() {
    if (!pendingAddress) {
      return;
    }

    const added = await addTrustlines();

    if (added) {
      return;
    }

    const connection = await connect();

    if (!connection || connection.address !== pendingAddress) {
      setSubmitError(
        "Connect the settlement wallet in your browser extension to add trustlines.",
      );
      return;
    }

    await addTrustlines();
  }

  async function handleChangeWallet() {
    await changeWallet();
    dismissTrustlineDialog();
    setSubmitError(null);
  }

  async function handleFinishSetup() {
    if (!pendingOrganization || !pendingAddress) {
      setSubmitError("Connect a Testnet wallet before continuing.");
      return;
    }

    if (hasMissingTrustlines) {
      setSubmitError(
        "Add trustlines for your accepted payment assets before continuing.",
      );
      return;
    }

    setSubmitError(null);
    setIsFinishing(true);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        body: pendingOrganization,
      });

      const payload = (await response.json()) as {
        error?: string;
        organization?: Organization;
      };

      if (!response.ok || !payload.organization) {
        setSubmitError(
          payload.error ?? "Unable to create organization. Please try again.",
        );
        setIsFinishing(false);
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
        setIsFinishing(false);
        return;
      }

      if (onSuccess) {
        onSuccess(payload.organization);
        setIsFinishing(false);
        return;
      }

      toast.success("Organization created successfully");
      window.location.assign(redirectTo);
    } catch {
      setSubmitError("Failed to complete onboarding");
      setIsFinishing(false);
    }
  }

  const finishBlockedReason = !pendingAddress
    ? "Connect a Testnet wallet to continue"
    : isCheckingTrustlines
      ? "Checking trustlines..."
      : hasMissingTrustlines
        ? "Add trustlines for your accepted payment assets to continue"
        : null;

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
          {submitError ? (
            <p className="mb-4 text-sm text-red-600">{submitError}</p>
          ) : null}
          <CreateOrganizationForm
            defaultEmail={defaultEmail}
            submitLabel="Continue"
            onStepComplete={handleOrganizationContinue}
          />
        </KycStepPage>
      ) : (
        <KycStepPage
          title="Settlement wallet"
          description="Connect a Testnet wallet and add trustlines for your accepted payment assets."
        >
          <TrustlineSetupDialog
            open={isTrustlineDialogOpen}
            missingAssets={missingAssets}
            isAdding={isAddingTrustlines}
            error={trustlineError}
            required
            onConfirm={() => void handleAddTrustlines()}
            onDismiss={dismissTrustlineDialog}
            onChangeWallet={() => void handleChangeWallet()}
          />

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
              isCheckingTrustlines={Boolean(pendingAddress && isCheckingTrustlines)}
              hasMissingTrustlines={Boolean(
                pendingAddress && !isCheckingTrustlines && hasMissingTrustlines,
              )}
              isAddingTrustlines={isAddingTrustlines}
              onAddTrustlines={() => void handleAddTrustlines()}
            />

            <ValidatedSubmitButton
              text="Finish setup"
              loading={isFinishing}
              className="w-full"
              type="button"
              onClick={() => void handleFinishSetup()}
              requiredError={finishBlockedReason}
              submitDisabled={
                !pendingAddress ||
                isCheckingTrustlines ||
                hasMissingTrustlines
              }
            />
          </div>
        </KycStepPage>
      )}
    </CreateOrganizationLayout>
  );
}
