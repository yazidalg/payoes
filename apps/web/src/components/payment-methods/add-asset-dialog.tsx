"use client";

import { useState } from "react";
import { BadgeCheckIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AppModal } from "@/ui/modals/app-modal";

type OfficialAssetOption = {
  asset_code: string;
  display_name: string;
  description: string;
  issued_by: string | null;
};

type ValidationResult = {
  asset_name: string;
  issuer: string;
  network: string;
};

type AddAssetDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableOfficialAssets: OfficialAssetOption[];
  onAdded: () => void;
};

export function AddAssetDialog({
  organizationId,
  open,
  onOpenChange,
  availableOfficialAssets,
  onAdded,
}: AddAssetDialogProps) {
  const [selectedOfficial, setSelectedOfficial] = useState<string | null>(null);
  const [assetCode, setAssetCode] = useState("");
  const [issuerAddress, setIssuerAddress] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setSelectedOfficial(null);
    setAssetCode("");
    setIssuerAddress("");
    setValidation(null);
    setError(null);
    setIsValidating(false);
    setIsSubmitting(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
    }
    onOpenChange(nextOpen);
  }

  async function validateCustomAsset() {
    setError(null);
    setValidation(null);
    setIsValidating(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/payment-methods/validate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_code: assetCode.trim().toUpperCase(),
          issuer_address: issuerAddress.trim(),
        }),
      }
    );

    const data = (await response.json()) as ValidationResult & {
      error?: string;
      valid?: boolean;
    };

    setIsValidating(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to validate asset");
      return;
    }

    setValidation(data);
  }

  async function addOfficialAsset() {
    if (!selectedOfficial) {
      setError("Select an official asset");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/organizations/${organizationId}/payment-methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "official",
        asset_code: selectedOfficial,
      }),
    });

    const data = (await response.json()) as { error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to add asset");
      return;
    }

    toast.success(`${selectedOfficial} added`);
    onAdded();
    handleOpenChange(false);
  }

  async function addCustomAsset() {
    if (!validation) {
      setError("Validate the asset before adding it");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/organizations/${organizationId}/payment-methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "custom",
        asset_code: assetCode.trim().toUpperCase(),
        issuer_address: issuerAddress.trim(),
      }),
    });

    const data = (await response.json()) as { error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to add asset");
      return;
    }

    toast.success(`${assetCode.toUpperCase()} added`);
    onAdded();
    handleOpenChange(false);
  }

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Add Asset"
      description="Add an official Stellar asset or configure a custom asset with its issuer."
      className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
      bodyClassName="space-y-6"
      footer={
        <>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {validation ? (
            <Button onClick={addCustomAsset} isLoading={isSubmitting}>
              Add Asset
            </Button>
          ) : (
            <Button
              onClick={addOfficialAsset}
              isLoading={isSubmitting}
              disabled={!selectedOfficial}
            >
              Add Asset
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Official Assets</h3>
              <p className="text-sm text-muted-foreground">
                Pre-verified assets with known issuers. No issuer address required.
              </p>
            </div>

            {availableOfficialAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All official assets are already configured.
              </p>
            ) : (
              <div className="space-y-2">
                {availableOfficialAssets.map((asset) => {
                  const isSelected = selectedOfficial === asset.asset_code;

                  return (
                    <button
                      key={asset.asset_code}
                      type="button"
                      onClick={() => {
                        setSelectedOfficial(asset.asset_code);
                        setValidation(null);
                        setError(null);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 size-4 shrink-0 rounded-full border",
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                        )}
                      />
                      <span className="space-y-1">
                        <span className="flex items-center gap-2 font-medium">
                          {asset.display_name}
                          <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                            <BadgeCheckIcon className="size-3" />
                            Official
                          </span>
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {asset.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">or</span>
            </div>
          </div>

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Custom Stellar Asset</h3>
              <p className="text-sm text-muted-foreground">
                Add any Stellar asset by code and issuer address.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-code">Asset Code</Label>
              <Input
                id="asset-code"
                placeholder="ACME"
                value={assetCode}
                onChange={(event) => {
                  setAssetCode(event.target.value.toUpperCase());
                  setValidation(null);
                }}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issuer-address">Issuer Address</Label>
              <Input
                id="issuer-address"
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXX"
                value={issuerAddress}
                onChange={(event) => {
                  setIssuerAddress(event.target.value);
                  setValidation(null);
                }}
                className="rounded-xl font-mono text-sm"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={validateCustomAsset}
              disabled={isValidating || !assetCode.trim() || !issuerAddress.trim()}
            >
              {isValidating ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Validate Asset
            </Button>

            {validation ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2Icon className="size-4" />
                  Asset found
                </p>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Asset Name</dt>
                    <dd className="font-medium">{validation.asset_name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Issuer</dt>
                    <dd className="max-w-[220px] truncate font-mono text-xs">
                      {validation.issuer}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Network</dt>
                    <dd className="font-medium">{validation.network}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium">Ready to add</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </section>

          {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
        </div>
    </AppModal>
  );
}
