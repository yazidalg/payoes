"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrustlineSetupDialog } from "@/components/wallet/trustline-setup-dialog";
import { useSettlementWalletConnection } from "@/hooks/use-settlement-wallet-connection";
import { useTrustlineSetup } from "@/hooks/use-trustline-setup";
import type { Organization } from "@/lib/db/schema";
import { Button } from "@dub/ui";

export function SettlementWalletPanel({
  organizationId,
  environment,
  initialAddress = null,
  initialWalletProvider = null,
}: {
  organizationId: string;
  environment: Organization["environment"];
  initialAddress?: string | null;
  initialWalletProvider?: string | null;
}) {
  const router = useRouter();
  const [savedAddress, setSavedAddress] = useState<string | null>(initialAddress);
  const [savedWalletProvider, setSavedWalletProvider] = useState<string | null>(
    initialWalletProvider,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    networkError,
    connectError,
    isConnecting,
    isReady,
    connect,
    networkLabel,
  } = useSettlementWalletConnection(environment);

  const isConfigured = Boolean(savedAddress);

  const {
    missingAssets,
    hasMissing: hasMissingTrustlines,
    isDialogOpen: isTrustlineDialogOpen,
    isAdding: isAddingTrustlines,
    error: trustlineError,
    addTrustlines,
    dismiss: dismissTrustlineDialog,
  } = useTrustlineSetup({
    organizationId,
    address: savedAddress,
    environment,
    enabled: isConfigured,
  });

  useEffect(() => {
    setSavedAddress(initialAddress);
    setSavedWalletProvider(initialWalletProvider);
  }, [initialAddress, initialWalletProvider]);

  const displayError = error ?? networkError ?? connectError;
  const isBusy = isConnecting || isSaving;

  async function persistWallet(targetAddress: string, provider: string | null) {
    setError(null);
    setIsSaving(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/settlement-wallet`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stellarAddress: targetAddress,
          walletProvider: provider,
        }),
      },
    );

    const data = (await response.json()) as {
      error?: string;
      wallet?: {
        stellarAddress: string;
        walletProvider: string | null;
      };
    };

    setIsSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to save settlement wallet.");
      return false;
    }

    setSavedAddress(data.wallet?.stellarAddress ?? targetAddress);
    setSavedWalletProvider(data.wallet?.walletProvider ?? provider);
    toast.success(
      initialAddress ? "Settlement wallet updated" : "Settlement wallet saved",
    );
    router.refresh();
    return true;
  }

  async function handleConnectAndSave() {
    setError(null);

    const connection = await connect();

    if (!connection) {
      return;
    }

    await persistWallet(connection.address, connection.provider);
  }

  async function handleAddTrustlines() {
    if (!savedAddress) {
      return;
    }

    const added = await addTrustlines();

    if (added) {
      return;
    }

    const connection = await connect();

    if (!connection || connection.address !== savedAddress) {
      setError(
        "Connect the settlement wallet in your browser extension to add trustlines.",
      );
      return;
    }

    await addTrustlines();
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-8">
      <TrustlineSetupDialog
        open={isTrustlineDialogOpen}
        missingAssets={missingAssets}
        isAdding={isAddingTrustlines}
        error={trustlineError}
        onConfirm={() => void handleAddTrustlines()}
        onDismiss={dismissTrustlineDialog}
      />

      <div>
        <h1 className="text-2xl font-medium text-neutral-900">Settlement wallet</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Connect your {networkLabel} wallet to receive {environment} payments.
        </p>
      </div>

      {displayError ? (
        <p className="text-sm text-red-600">{displayError}</p>
      ) : null}

      {isConfigured ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-content-subtle text-sm">Connected address</p>
            <p className="text-content-default break-all font-mono text-sm">
              {savedAddress}
            </p>
            {savedWalletProvider ? (
              <p className="text-content-subtle text-xs">
                Wallet provider saved for this connection.
              </p>
            ) : null}
          </div>

          {hasMissingTrustlines ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-700">
                This wallet is missing trustlines for enabled payment assets.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="h-9"
                text="Add trustlines"
                loading={isAddingTrustlines}
                disabled={isAddingTrustlines || isBusy}
                onClick={() => void handleAddTrustlines()}
              />
            </div>
          ) : null}

          <Button
            type="button"
            className="h-9"
            text="Update wallet"
            loading={isBusy}
            disabled={!isReady || isBusy}
            onClick={() => void handleConnectAndSave()}
          />
        </div>
      ) : (
        <Button
          type="button"
          className="h-9"
          text="Connect wallet"
          loading={isBusy}
          disabled={!isReady || isBusy}
          onClick={() => void handleConnectAndSave()}
        />
      )}
    </div>
  );
}
