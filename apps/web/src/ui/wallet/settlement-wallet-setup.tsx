"use client";

import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { ConnectedWallet } from "./connected-wallet";

export function SettlementWalletSetup({
  networkLabel,
  pendingAddress,
  networkError,
  connectError,
  error,
  isConnecting,
  isReady,
  onConnect,
  className,
}: {
  networkLabel: string;
  pendingAddress: string | null;
  walletProvider: string | null;
  networkError: string | null;
  connectError: string | null;
  error?: string | null;
  isConnecting: boolean;
  isReady: boolean;
  onConnect: () =>
    void | Promise<void> | Promise<{ address: string; provider: string | null } | null>;
  className?: string;
}) {
  const displayError = error ?? networkError ?? connectError;

  return (
    <div className={cn("space-y-3", className)}>
      {displayError ? (
        <p className="text-sm text-red-600">{displayError}</p>
      ) : null}

      {pendingAddress ? (
        <ConnectedWallet
          address={pendingAddress}
          networkLabel={networkLabel}
        />
      ) : null}

      <Button
        type="button"
        text={pendingAddress ? "Connect another wallet" : "Connect wallet"}
        variant={pendingAddress ? "secondary" : "primary"}
        className="h-9"
        loading={isConnecting}
        disabled={!isReady || isConnecting}
        onClick={() => void onConnect()}
      />
    </div>
  );
}
