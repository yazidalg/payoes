"use client";

import { apiFetch } from "@/lib/api-client";
import type { CreateBusinessStep } from "@/constants/business/create-steps";
import type { Organization } from "@/lib/db/schema";
import { CreateBusinessForm } from "@/components/business/create-business-form";
import { TrustlineSetupDialog } from "@/components/wallet/trustline-setup-dialog";
import { useSettlementWalletConnection } from "@/hooks/use-settlement-wallet-connection";
import { useTrustlineSetup } from "@/hooks/use-trustline-setup";
import { CreateBusinessLayout } from "@/ui/business/create-business-layout";
import { KycStepPage } from "@/ui/kyc/kyc-step-page";
import { SettlementWalletSetup } from "@/ui/wallet/settlement-wallet-setup";
import { ValidatedSubmitButton } from "@/ui/forms/validated-submit-button";
import { useState } from "react";
import { toast } from "sonner";

export function CreateBusinessWizard({
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
    useState<CreateBusinessStep>("business");
  const [businessComplete, setBusinessComplete] = useState(false);
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

  async function handleBusinessContinue(formData: FormData) {
    setSubmitError(null);
    setPendingOrganization(formData);
    setBusinessComplete(true);
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
      const response = await apiFetch("/api/organizations", {
        method: "POST",
        body: pendingOrganization,
      });

      const payload = (await response.json()) as {
        error?: string;
        organization?: Organization;
      };

      if (!response.ok || !payload.organization) {
        setSubmitError(
          payload.error ?? "Unable to create business. Please try again.",
        );
        setIsFinishing(false);
        return;
      }

      const walletResponse = await apiFetch(
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
            "Business created, but the settlement wallet could not be saved.",
        );
        setIsFinishing(false);
        return;
      }

      if (onSuccess) {
        onSuccess(payload.organization);
        setIsFinishing(false);
        return;
      }

      toast.success("Business created successfully");
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
    <CreateBusinessLayout
      currentStep={currentStep}
      businessComplete={businessComplete}
      onStepChange={setCurrentStep}
      showCloseButton={showCloseButton}
      onClose={onClose}
      closeHref={closeHref}
    >
      {currentStep === "business" ? (
        <KycStepPage
          title="Business details"
          description="Set up your workspace name and business profile."
        >
          {submitError ? (
            <p className="mb-4 text-sm text-red-600">{submitError}</p>
          ) : null}
          <CreateBusinessForm
            defaultEmail={defaultEmail}
            submitLabel="Continue"
            onStepComplete={handleBusinessContinue}
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
    </CreateBusinessLayout>
  );
}
