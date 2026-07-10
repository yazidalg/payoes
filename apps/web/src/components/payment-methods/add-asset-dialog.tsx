"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { AppModal } from "@/ui/modals/app-modal";
import { Button, Combobox, Input, type ComboboxOption } from "@dub/ui";

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

function toOfficialOption(asset: OfficialAssetOption): ComboboxOption {
  return {
    value: asset.asset_code,
    label: asset.display_name,
    meta: asset,
  };
}

export function AddAssetDialog({
  organizationId,
  open,
  onOpenChange,
  availableOfficialAssets,
  onAdded,
}: AddAssetDialogProps) {
  const [selectedOfficial, setSelectedOfficial] = useState<ComboboxOption | null>(
    null,
  );
  const [assetCode, setAssetCode] = useState("");
  const [issuerAddress, setIssuerAddress] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const officialOptions = useMemo(
    () => availableOfficialAssets.map(toOfficialOption),
    [availableOfficialAssets],
  );

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
      },
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
        asset_code: selectedOfficial.value,
      }),
    });

    const data = (await response.json()) as { error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to add asset");
      return;
    }

    toast.success(`${selectedOfficial.label} added`);
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

  const canSubmitCustom = Boolean(validation);
  const canSubmitOfficial = Boolean(selectedOfficial);

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Add asset"
      description="Add an official Stellar asset or configure a custom asset with its issuer."
      className="sm:max-w-md"
      bodyClassName="space-y-6"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            onClick={() => handleOpenChange(false)}
          />
          <Button
            type="button"
            text="Add asset"
            loading={isSubmitting}
            disabled={canSubmitCustom ? false : !canSubmitOfficial}
            onClick={() => void (canSubmitCustom ? addCustomAsset() : addOfficialAsset())}
          />
        </div>
      }
    >
      <div className="space-y-2">
        <FormFieldLabel htmlFor="official-asset-picker">Official asset</FormFieldLabel>
        {officialOptions.length === 0 ? (
          <p className="text-content-subtle text-sm">
            All official assets are already configured.
          </p>
        ) : (
          <Combobox
            selected={selectedOfficial}
            setSelected={(option: ComboboxOption | null) => {
              setSelectedOfficial(option);
              setValidation(null);
              setError(null);
            }}
            options={officialOptions}
            placeholder="Select official asset"
            searchPlaceholder="Search official assets..."
            matchTriggerWidth
            optionDescription={(option) => {
              const asset = option.meta as OfficialAssetOption | undefined;
              return asset?.description ?? null;
            }}
            buttonProps={{
              id: "official-asset-picker",
              className: "h-10 w-full justify-between",
              textWrapperClassName: "min-w-0 flex-1 text-left",
            }}
          />
        )}
        <p className="text-content-subtle text-xs">
          Pre-verified assets with known issuers. No issuer address required.
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-neutral-400">or</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-content-default text-sm font-medium">Custom asset</p>
          <p className="text-content-subtle mt-1 text-xs">
            Add any Stellar asset by code and issuer address.
          </p>
        </div>

        <div className="space-y-2">
          <FormFieldLabel htmlFor="asset-code">Asset code</FormFieldLabel>
          <Input
            id="asset-code"
            placeholder="ACME"
            value={assetCode}
            onChange={(event) => {
              setAssetCode(event.target.value.toUpperCase());
              setValidation(null);
            }}
          />
        </div>

        <div className="space-y-2">
          <FormFieldLabel htmlFor="issuer-address">Issuer address</FormFieldLabel>
          <Input
            id="issuer-address"
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXX"
            value={issuerAddress}
            onChange={(event) => {
              setIssuerAddress(event.target.value);
              setValidation(null);
            }}
            className="font-mono text-sm"
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          text="Validate asset"
          loading={isValidating}
          disabled={!assetCode.trim() || !issuerAddress.trim()}
          onClick={() => void validateCustomAsset()}
        />

        {validation ? (
          <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm">
            <p className="font-medium text-emerald-800">Asset found</p>
            <dl className="grid gap-1 text-xs text-emerald-900">
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-700">Name</dt>
                <dd className="font-medium">{validation.asset_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-700">Issuer</dt>
                <dd className="max-w-[220px] truncate font-mono">
                  {validation.issuer}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-700">Network</dt>
                <dd className="font-medium">{validation.network}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>

      {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
    </AppModal>
  );
}
