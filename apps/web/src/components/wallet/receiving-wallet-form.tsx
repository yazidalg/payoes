"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, CopyIcon, WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { EnvironmentBadge } from "@/components/shared/environment-badge";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useReceivingWalletConnection } from "@/hooks/use-receiving-wallet-connection";
import { useTrustlineSetup } from "@/hooks/use-trustline-setup";
import { TrustlineSetupDialog } from "@/components/wallet/trustline-setup-dialog";
import type { Organization } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

function formatWalletProvider(provider: string | null | undefined) {
  if (!provider) {
    return null;
  }

  return provider
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type ReceivingWalletFormProps = {
  organizationId: string;
  organizationName: string;
  environment: Organization["environment"];
  initialAddress?: string | null;
  initialWalletProvider?: string | null;
  initialConnectedAt?: string | null;
};

export function ReceivingWalletForm({
  organizationId,
  organizationName,
  environment,
  initialAddress = null,
  initialWalletProvider = null,
  initialConnectedAt = null,
}: ReceivingWalletFormProps) {
  const router = useRouter();
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
  } = useReceivingWalletConnection(environment);

  const [savedAddress, setSavedAddress] = useState<string | null>(initialAddress);
  const [savedWalletProvider, setSavedWalletProvider] = useState<string | null>(
    initialWalletProvider
  );
  const [savedConnectedAt, setSavedConnectedAt] = useState<string | null>(
    initialConnectedAt
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    enabled: isConfigured && !isUpdating,
  });

  useEffect(() => {
    setSavedAddress(initialAddress);
    setSavedWalletProvider(initialWalletProvider);
    setSavedConnectedAt(initialConnectedAt);
  }, [initialAddress, initialWalletProvider, initialConnectedAt]);

  async function copyAddress(address: string) {
    await navigator.clipboard.writeText(address);
    toast.success("Address copied");
  }

  async function persistWallet(targetAddress: string, provider: string | null) {
    setError(null);
    setIsSaving(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/receiving-wallet`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stellarAddress: targetAddress,
          walletProvider: provider,
        }),
      }
    );

    const data = (await response.json()) as {
      error?: string;
      wallet?: {
        stellarAddress: string;
        walletProvider: string | null;
        connectedAt: string;
      };
    };

    setIsSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to save receiving wallet.");
      return false;
    }

    setSavedAddress(data.wallet?.stellarAddress ?? targetAddress);
    setSavedWalletProvider(data.wallet?.walletProvider ?? provider);
    setSavedConnectedAt(data.wallet?.connectedAt ?? new Date().toISOString());
    clearPending();
    setIsUpdating(false);
    toast.success(isConfigured ? "Receiving wallet updated" : "Receiving wallet saved");
    router.refresh();
    return true;
  }

  async function handleConnect() {
    await connect();
  }

  async function handleConfirmSave() {
    if (!pendingAddress) {
      setError("Connect a wallet before saving.");
      return;
    }

    await persistWallet(pendingAddress, walletProvider);
  }

  async function handleAddTrustlines() {
    if (!savedAddress) {
      return;
    }

    const added = await addTrustlines();

    if (added) {
      return;
    }

    const connectedAddress = await connect();

    if (!connectedAddress || connectedAddress !== savedAddress) {
      setError(
        "Connect the receiving wallet in your browser extension to add trustlines."
      );
      return;
    }

    await addTrustlines();
  }

  function handleStartUpdate() {
    setError(null);
    clearPending();
    setIsUpdating(true);
  }

  function handleCancelUpdate() {
    clearPending();
    setIsUpdating(false);
    setError(null);
  }

  const showSetupFlow = !isConfigured;
  const showUpdateFlow = isConfigured && isUpdating;
  const canConfirmSave = Boolean(pendingAddress) && (showSetupFlow || showUpdateFlow);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <TrustlineSetupDialog
        open={isTrustlineDialogOpen}
        missingAssets={missingAssets}
        isAdding={isAddingTrustlines}
        error={trustlineError}
        onConfirm={() => void handleAddTrustlines()}
        onDismiss={dismissTrustlineDialog}
      />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Receiving wallet</h1>
          <EnvironmentBadge environment={environment} />
        </div>
        <p className="text-sm text-muted-foreground">
          Payments for <span className="font-medium text-foreground">{organizationName}</span>{" "}
          are sent to this Stellar address on {networkLabel}. Customer payment assets are
          configured in Settings → Assets.
        </p>
      </div>

      {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
      {connectError ? <AlertBlock type="error">{connectError}</AlertBlock> : null}
      {networkError ? <AlertBlock type="error">{networkError}</AlertBlock> : null}

      {isConfigured && !isUpdating ? (
        <Card className="rounded-2xl">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg">Connected wallet</CardTitle>
                <CardDescription>
                  This wallet receives {environment} payments for your organization.
                </CardDescription>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2Icon className="size-3.5" />
                Connected
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-background">
                  <WalletIcon className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Stellar address
                    </p>
                    <p className="mt-1 break-all font-mono text-sm">{savedAddress}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Network: {networkLabel}</span>
                    {savedWalletProvider ? (
                      <span>
                        Wallet: {formatWalletProvider(savedWalletProvider)}
                      </span>
                    ) : null}
                    {savedConnectedAt ? (
                      <span>
                        Connected{" "}
                        {new Date(savedConnectedAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void copyAddress(savedAddress!)}
                  aria-label="Copy address"
                >
                  <CopyIcon className="size-4" />
                </Button>
              </div>
            </div>

            {hasMissingTrustlines ? (
              <AlertBlock type="warning">
                <div className="space-y-3">
                  <p>
                    This wallet is missing trustlines for one or more payment
                    assets. Add trustlines so customers can pay you without
                    errors.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleAddTrustlines()}
                    isLoading={isAddingTrustlines}
                    disabled={isAddingTrustlines}
                  >
                    Add trustlines
                  </Button>
                </div>
              </AlertBlock>
            ) : null}

            <Button type="button" variant="outline" onClick={handleStartUpdate}>
              Update wallet
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {showSetupFlow || showUpdateFlow ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">
              {showUpdateFlow ? "Update receiving wallet" : "Connect receiving wallet"}
            </CardTitle>
            <CardDescription>
              {showUpdateFlow
                ? "Choose a different wallet to replace the current receiving address. You must approve the connection in your wallet extension."
                : "Connect the Stellar wallet that should receive payments. You must approve the connection in your wallet extension every time."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "rounded-xl border border-dashed p-4",
                pendingAddress ? "border-primary/40 bg-primary/5" : "bg-muted/20"
              )}
            >
              <p className="text-sm font-medium">
                {pendingAddress ? "Wallet ready to save" : "No wallet selected"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Required network: {networkLabel}
              </p>
              {pendingAddress ? (
                <div className="mt-3 space-y-1">
                  <p className="break-all font-mono text-sm">{pendingAddress}</p>
                  {walletProvider ? (
                    <p className="text-xs text-muted-foreground">
                      via {formatWalletProvider(walletProvider)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Click connect to open your wallet and approve access. Payoes never stores
                  your private keys.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleConnect()}
                disabled={!isReady || isConnecting || isSaving}
                isLoading={isConnecting}
              >
                {pendingAddress ? "Connect another wallet" : "Connect wallet"}
              </Button>
              {showUpdateFlow ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelUpdate}
                  disabled={isConnecting || isSaving}
                >
                  Cancel
                </Button>
              ) : null}
            </div>

            {canConfirmSave ? (
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={() => void handleConfirmSave()}
                disabled={isSaving}
                isLoading={isSaving}
              >
                {showUpdateFlow ? "Confirm update" : "Save receiving wallet"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
