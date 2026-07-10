"use client";

import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { FormFieldLabel } from "@/ui/forms/form-field-label";

function formatWalletProvider(provider: string | null | undefined) {
  if (!provider) {
    return null;
  }

  return provider
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SettlementWalletSetup({
  networkLabel,
  pendingAddress,
  walletProvider,
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
    <div className={cn("space-y-4", className)}>
      {displayError ? (
        <p className="text-sm text-red-600">{displayError}</p>
      ) : null}

      <div className="space-y-2">
        <FormFieldLabel htmlFor="settlement-wallet-connect" required>
          Settlement wallet
        </FormFieldLabel>
        <p className="text-content-subtle text-sm">
          Connect a {networkLabel} wallet. Payments are sent to this address.
        </p>
        {pendingAddress ? (
          <div className="space-y-1">
            <p className="text-content-default break-all font-mono text-sm">
              {pendingAddress}
            </p>
            {walletProvider ? (
              <p className="text-content-subtle text-xs">
                via {formatWalletProvider(walletProvider)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

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
