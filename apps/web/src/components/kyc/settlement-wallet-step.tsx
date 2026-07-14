"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrustlineSetupDialog } from "@/components/wallet/trustline-setup-dialog";
import { useSettlementWalletConnection } from "@/hooks/use-settlement-wallet-connection";
import { useTrustlineSetup } from "@/hooks/use-trustline-setup";
import { KycStepPage } from "@/ui/kyc/kyc-step-page";
import { SettlementWalletSetup } from "@/ui/wallet/settlement-wallet-setup";
import { ValidatedSubmitButton } from "@/ui/forms/validated-submit-button";

export function SettlementWalletStep({
  organizationId,
  isOwner,
}: {
  organizationId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    pendingAddress,
    walletProvider,
    networkError,
    connectError,
    isConnecting,
    isReady,
    connect,
    changeWallet,
    clearPending,
    networkLabel,
  } = useSettlementWalletConnection("production");

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
    organizationId,
    address: pendingAddress,
    environment: "production",
    enabled: Boolean(pendingAddress),
    required: true,
  });

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
      setError(
        "Connect the settlement wallet in your browser extension to add trustlines.",
      );
      return;
    }

    await addTrustlines();
  }

  async function handleChangeWallet() {
    await changeWallet();
    dismissTrustlineDialog();
    setError(null);
  }

  async function handleSave() {
    if (!pendingAddress) {
      setError("Connect a Mainnet wallet before continuing.");
      return;
    }

    if (hasMissingTrustlines) {
      setError(
        "Add trustlines for your accepted payment assets before continuing.",
      );
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const walletResponse = await fetch(
        `/api/organizations/${organizationId}/settlement-wallet`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stellarAddress: pendingAddress,
            walletProvider,
            environment: "production",
          }),
        },
      );

      const walletData = (await walletResponse.json()) as { error?: string };

      if (!walletResponse.ok) {
        setError(walletData.error ?? "Unable to save settlement wallet.");
        setIsSaving(false);
        return;
      }

      const environmentResponse = await fetch(
        `/api/organizations/${organizationId}/environment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ environment: "production" }),
        },
      );

      const environmentData = (await environmentResponse.json()) as {
        error?: string;
      };

      if (!environmentResponse.ok) {
        setError(
          environmentData.error ??
            "Settlement wallet saved, but production mode could not be enabled.",
        );
        setIsSaving(false);
        return;
      }

      clearPending();
      toast.success("Production setup complete");
      router.push("/dashboard/payments");
      router.refresh();
    } catch {
      setError("Failed to complete production setup");
      setIsSaving(false);
    }
  }

  const saveBlockedReason = !pendingAddress
    ? "Connect a Mainnet wallet to continue"
    : isCheckingTrustlines
      ? "Checking trustlines..."
      : hasMissingTrustlines
        ? "Add trustlines for your accepted payment assets to continue"
        : null;

  if (!isOwner) {
    return (
      <KycStepPage
        title="Settlement wallet"
        description="Only the organization owner can configure the production wallet."
      >
        <p className="text-sm text-neutral-500">
          Ask your organization owner to complete this step.
        </p>
      </KycStepPage>
    );
  }

  return (
    <KycStepPage
      title="Settlement wallet"
      description="Connect a Mainnet wallet and add trustlines for your accepted payment assets."
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
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
          missingTrustlinesMessage="Add them to enable production payments."
        />

        <ValidatedSubmitButton
          text="Finish setup"
          loading={isSaving}
          className="w-full"
          type="button"
          onClick={() => void handleSave()}
          requiredError={saveBlockedReason}
          submitDisabled={
            !pendingAddress || isCheckingTrustlines || hasMissingTrustlines
          }
        />
      </div>
    </KycStepPage>
  );
}
