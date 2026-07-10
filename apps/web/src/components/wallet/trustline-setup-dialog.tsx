"use client";

import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { STELLAR_TRUSTLINE_RESERVE_XLM } from "@/constants/stellar";
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
};

export function TrustlineSetupDialog({
  open,
  missingAssets,
  isAdding,
  error,
  onConfirm,
  onDismiss,
}: TrustlineSetupDialogProps) {
  return (
    <AppModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isAdding) {
          onDismiss();
        }
      }}
      title="Add trustlines to receive payments"
      description="Your receiving wallet is missing trustlines for assets enabled in Settings → Assets. Add them now so customers can pay you without errors."
      preventDefaultClose={isAdding}
      footer={
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

        <p className="text-xs text-muted-foreground">
          Each trustline requires about {STELLAR_TRUSTLINE_RESERVE_XLM} XLM in
          reserve. Your wallet must already be funded on this network.
        </p>

        {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
      </div>
    </AppModal>
  );
}
