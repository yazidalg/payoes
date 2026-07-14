"use client";

import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import type { MissingTrustlineAsset } from "@/hooks/use-trustline-setup";
import { AppModal } from "@/ui/modals/app-modal";

function shortenIssuer(issuer: string | null) {
  if (!issuer) {
    return null;
  }

  if (issuer.length <= 12) {
    return issuer;
  }

  return `${issuer.slice(0, 4)}...${issuer.slice(-4)}`;
}

type TrustlineSetupDialogProps = {
  open: boolean;
  missingAssets: MissingTrustlineAsset[];
  isAdding: boolean;
  error: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
  onChangeWallet?: () => void;
  onCancel?: () => void;
  required?: boolean;
  description?: string;
};

export function TrustlineSetupDialog({
  open,
  missingAssets,
  isAdding,
  error,
  onConfirm,
  onDismiss,
  onChangeWallet,
  onCancel,
  required = false,
  description,
}: TrustlineSetupDialogProps) {
  return (
    <AppModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isAdding) {
          if (required && onCancel) {
            onCancel();
          } else if (!required) {
            onDismiss();
          }
        }
      }}
      title="Add trustlines to receive payments"
      description={
        description ??
        (required
          ? "Your settlement wallet must have trustlines for accepted payment assets before you can continue onboarding."
          : "Your settlement wallet is missing trustlines for accepted payment assets. Add them so customers can pay without errors.")
      }
      preventDefaultClose={isAdding || (required && !onCancel)}
      footer={
        required ? (
          <>
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isAdding}
              >
                Cancel
              </Button>
            ) : null}
            {onChangeWallet ? (
              <Button
                type="button"
                variant="outline"
                onClick={onChangeWallet}
                disabled={isAdding}
              >
                Change wallet
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => void onConfirm()}
              isLoading={isAdding}
              disabled={isAdding}
            >
              Add trustlines
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onDismiss}
              disabled={isAdding}
            >
              Skip for now
            </Button>
            <Button
              type="button"
              onClick={() => void onConfirm()}
              isLoading={isAdding}
              disabled={isAdding}
            >
              Add trustlines
            </Button>
          </>
        )
      }
    >
      <div className="space-y-3">
        <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">
          {missingAssets.map((asset) => (
            <li
              key={`${asset.asset_code}:${asset.issuer_address ?? ""}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div>
                <p className="font-medium">{asset.display_name}</p>
                {asset.issuer_address ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    {shortenIssuer(asset.issuer_address)}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {asset.asset_code}
              </span>
            </li>
          ))}
        </ul>

        {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
      </div>
    </AppModal>
  );
}
