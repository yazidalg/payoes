"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useStellarWallet } from "@/hooks/use-stellar-wallet";
import {
  ACCEPTED_ASSET_OPTIONS,
  type AcceptedAsset,
} from "@/lib/organizations/wallet-constants";
import type { Organization } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { WalletIcon } from "lucide-react";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

type ReceivingWalletFormProps = {
  organizationId: string;
  environment: Organization["environment"];
  mode: "onboarding" | "settings";
  initialAssets?: AcceptedAsset[];
  initialAddress?: string | null;
};

export function ReceivingWalletForm({
  organizationId,
  environment,
  mode,
  initialAssets = ["USDC", "XLM"],
  initialAddress = null,
}: ReceivingWalletFormProps) {
  const router = useRouter();
  const {
    address,
    walletProvider,
    networkError,
    connectError,
    isConnecting,
    isReady,
    connect,
    disconnect,
    networkLabel,
  } = useStellarWallet(environment);

  const [acceptedAssets, setAcceptedAssets] =
    useState<AcceptedAsset[]>(initialAssets);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeAddress = address ?? initialAddress;

  function toggleAsset(asset: AcceptedAsset) {
    setAcceptedAssets((current) => {
      if (current.includes(asset)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== asset);
      }

      return [...current, asset];
    });
  }

  async function handleSave() {
    if (!activeAddress) {
      setError("Connect a wallet before saving.");
      return;
    }

    setError(null);
    setIsSaving(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/receiving-wallet`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stellarAddress: activeAddress,
          acceptedAssets,
          walletProvider,
        }),
      }
    );

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to save receiving wallet.");
      setIsSaving(false);
      return;
    }

    toast.success("Receiving wallet saved");

    if (mode === "onboarding") {
      router.push("/dashboard/payments");
      router.refresh();
      return;
    }

    router.refresh();
    setIsSaving(false);
  }

  const isOnboarding = mode === "onboarding";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {isOnboarding ? (
        <p className="text-sm font-medium text-muted-foreground">
          Step 2 of 3
        </p>
      ) : null}

      <CardTitle className="text-2xl font-bold">
        {isOnboarding ? "Configure your receiving wallet" : "Receiving wallet"}
      </CardTitle>
      <CardDescription className="text-center">
        Connect a Stellar wallet to choose where payments are sent. Payoes never
        stores your private keys.
      </CardDescription>

      <div className="w-full space-y-4">
        {error ? (
          <AlertBlock type="error" className="my-2">
            {error}
          </AlertBlock>
        ) : null}

        {connectError ? (
          <AlertBlock type="error" className="my-2">
            {connectError}
          </AlertBlock>
        ) : null}

        {networkError ? (
          <AlertBlock type="error" className="my-2">
            {networkError}
          </AlertBlock>
        ) : null}

        <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Wallet connection
              </p>
              <p className="text-sm text-muted-foreground">
                Required network: {networkLabel}
              </p>
              {activeAddress ? (
                <p className="font-mono text-sm text-foreground">
                  {truncateAddress(activeAddress)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No wallet connected yet.
                </p>
              )}
            </div>
            <WalletIcon className="size-5 shrink-0 text-muted-foreground" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void connect()}
              disabled={!isReady || isConnecting}
              isLoading={isConnecting}
            >
              {activeAddress ? "Reconnect wallet" : "Connect wallet"}
            </Button>
            {activeAddress ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void disconnect()}
                disabled={isConnecting}
              >
                Disconnect
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Accepted assets</Label>
          <div className="flex flex-wrap gap-2">
            {ACCEPTED_ASSET_OPTIONS.map((asset) => {
              const isSelected = acceptedAssets.includes(asset);

              return (
                <button
                  key={asset}
                  type="button"
                  onClick={() => toggleAsset(asset)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {asset}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Select at least one asset customers can pay with.
          </p>
        </div>

        <Button
          type="button"
          className="w-full"
          size="lg"
          onClick={() => void handleSave()}
          disabled={!activeAddress || isSaving}
          isLoading={isSaving}
        >
          {isOnboarding ? "Save and continue" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
