"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSettlementWalletConnection } from "@/hooks/use-settlement-wallet-connection";
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
    clearPending,
    networkLabel,
  } = useSettlementWalletConnection("production");

  async function handleSave() {
    if (!pendingAddress) {
      setError("Connect a Mainnet wallet before continuing.");
      return;
    }

    setError(null);
    setIsSaving(true);

    const response = await fetch(
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

    const data = (await response.json()) as { error?: string };

    setIsSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to save settlement wallet.");
      return;
    }

    clearPending();
    toast.success("Production settlement wallet saved");
    router.push("/dashboard/payments");
    router.refresh();
  }

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
      description="Connect the Mainnet wallet that receives live payments."
    >
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
        />

        <ValidatedSubmitButton
          text="Save and continue"
          loading={isSaving}
          className="w-full"
          type="button"
          onClick={() => void handleSave()}
          requiredError={
            pendingAddress ? null : "Connect a Mainnet wallet to continue"
          }
          submitDisabled={!pendingAddress}
        />
      </div>
    </KycStepPage>
  );
}
