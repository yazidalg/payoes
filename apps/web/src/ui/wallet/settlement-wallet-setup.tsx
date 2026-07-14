"use client";

import { Button } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/icons";
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
  isCheckingTrustlines = false,
  hasMissingTrustlines = false,
  isAddingTrustlines = false,
  onAddTrustlines,
  missingTrustlinesMessage = "Add them to continue onboarding.",
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
  isCheckingTrustlines?: boolean;
  hasMissingTrustlines?: boolean;
  isAddingTrustlines?: boolean;
  onAddTrustlines?: () => void;
  missingTrustlinesMessage?: string;
  className?: string;
}) {
  const displayError = error ?? networkError ?? connectError;

  return (
    <div className={cn("space-y-4", className)}>
      {displayError ? (
        <p className="text-sm text-red-600">{displayError}</p>
      ) : null}

      {pendingAddress ? (
        <div className="space-y-2">
          <ConnectedWallet
            address={pendingAddress}
            networkLabel={networkLabel}
          />

          {isCheckingTrustlines ? (
            <p className="flex items-center gap-2 text-sm text-neutral-500">
              <LoadingSpinner className="size-3.5 shrink-0 text-neutral-500" />
              Checking trustlines...
            </p>
          ) : null}

          {!isCheckingTrustlines && hasMissingTrustlines ? (
            <p className="text-sm text-neutral-600">
              This wallet is missing trustlines for your accepted payment assets.{" "}
              {missingTrustlinesMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {!isCheckingTrustlines && hasMissingTrustlines && onAddTrustlines ? (
        <Button
          type="button"
          variant="secondary"
          className="h-9 w-full"
          text="Add trustlines"
          loading={isAddingTrustlines}
          disabled={isAddingTrustlines}
          onClick={() => void onAddTrustlines()}
        />
      ) : null}

      <Button
        type="button"
        text={pendingAddress ? "Connect another wallet" : "Connect wallet"}
        variant={pendingAddress ? "secondary" : "primary"}
        className="h-9 w-full"
        loading={isConnecting}
        disabled={!isReady || isConnecting}
        onClick={() => void onConnect()}
      />
    </div>
  );
}
