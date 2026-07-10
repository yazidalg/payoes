"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddAssetDialog } from "@/components/payment-methods/add-asset-dialog";
import { useAsyncData } from "@/hooks/use-async-data";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { SerializedPaymentMethod } from "@/lib/payment-methods/service";
import { SettingsSection } from "@/ui/settings/settings-section";
import { Button, Combobox, type ComboboxOption } from "@dub/ui";

type OfficialAssetOption = {
  asset_code: string;
  display_name: string;
  description: string;
  issued_by: string | null;
};

type PaymentMethodsResponse = {
  payment_methods: SerializedPaymentMethod[];
  available_official_assets: OfficialAssetOption[];
  settlement_asset_id: string | null;
};

function toOption(method: SerializedPaymentMethod): ComboboxOption {
  return {
    value: method.id,
    label: method.display_name,
    meta: method,
  };
}

export function PaymentMethodsPanel({ organizationId }: { organizationId: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [localMethods, setLocalMethods] = useState<SerializedPaymentMethod[] | null>(
    null,
  );
  const [settlementAssetId, setSettlementAssetId] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/payment-methods`);
    const payload = await readJsonResponse<PaymentMethodsResponse & { error?: string }>(
      response,
    );

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load payment methods");
    }

    return payload;
  }, [organizationId]);

  const { data, error, isLoading, reload } = useAsyncData(fetchMethods, [organizationId]);

  useEffect(() => {
    if (!data) {
      return;
    }

    setLocalMethods(data.payment_methods);
    setSettlementAssetId(data.settlement_asset_id);
  }, [data]);

  const methods = localMethods ?? data?.payment_methods ?? [];

  const allOptions = useMemo(
    () => methods.map(toOption),
    [methods],
  );

  const enabledOptions = useMemo(
    () => methods.filter((m) => m.is_enabled).map(toOption),
    [methods],
  );

  const settlementOption = useMemo(() => {
    if (!settlementAssetId) {
      return null;
    }

    return enabledOptions.find((option) => option.value === settlementAssetId) ?? null;
  }, [settlementAssetId, enabledOptions]);

  const customMethods = useMemo(
    () => methods.filter((method) => !method.is_official),
    [methods],
  );

  async function toggleMethod(methodId: string, enabled: boolean) {
    const response = await fetch(
      `/api/organizations/${organizationId}/payment-methods/${methodId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: enabled }),
      },
    );

    const payload = await readJsonResponse<{ error?: string }>(response);

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to update payment method");
    }
  }

  async function handleAcceptedChange(nextSelected: ComboboxOption[]) {
    if (!localMethods) {
      return;
    }

    if (
      settlementAssetId &&
      !nextSelected.some((option) => option.value === settlementAssetId)
    ) {
      toast.error("Settlement asset must stay in accepted payment methods");
      return;
    }

    const nextIds = new Set(nextSelected.map((option) => option.value));
    const changes = localMethods.filter(
      (method) => method.is_enabled !== nextIds.has(method.id),
    );

    if (changes.length === 0) {
      return;
    }

    const previousMethods = localMethods;

    setLocalMethods(
      localMethods.map((method) => ({
        ...method,
        is_enabled: nextIds.has(method.id),
      })),
    );

    try {
      await Promise.all(
        changes.map((method) => toggleMethod(method.id, nextIds.has(method.id))),
      );
    } catch (syncError) {
      setLocalMethods(previousMethods);
      toast.error(
        syncError instanceof Error
          ? syncError.message
          : "Unable to update accepted payment methods",
      );
    }
  }

  async function removeMethod(methodId: string) {
    const response = await fetch(
      `/api/organizations/${organizationId}/payment-methods/${methodId}`,
      { method: "DELETE" },
    );

    const payload = await readJsonResponse<{ error?: string }>(response);

    if (!response.ok) {
      toast.error(payload.error ?? "Unable to remove payment method");
      return;
    }

    toast.success("Payment method removed");
    reload();
  }

  async function setSettlement(methodId: string) {
    const previousSettlementId = settlementAssetId;

    setSettlementAssetId(methodId);

    const response = await fetch(
      `/api/organizations/${organizationId}/payment-methods/settlement`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method_id: methodId }),
      },
    );

    const payload = await readJsonResponse<{ error?: string }>(response);

    if (!response.ok) {
      setSettlementAssetId(previousSettlementId);
      toast.error(payload.error ?? "Unable to update settlement asset");
      return;
    }
  }

  if (error) {
    return (
      <div className="mb-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="mb-6 space-y-6">
        <div className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
        <div className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-6">
      <SettingsSection
        title="Accepted assets"
        description="Choose which Stellar assets customers can use to pay you."
        helpText="Customers can pay using any selected asset. Settlement asset must remain selected."
      >
        <Combobox
          multiple
          selected={enabledOptions}
          setSelected={(options: ComboboxOption[]) => void handleAcceptedChange(options)}
          options={allOptions}
          placeholder="Select accepted assets"
          searchPlaceholder="Search assets..."
          matchTriggerWidth
          optionDescription={(option) => {
            const method = option.meta as SerializedPaymentMethod | undefined;
            if (!method) {
              return null;
            }

            return (
              <span className="text-content-subtle text-xs">
                {method.is_official ? "Official" : "Custom"}
                {method.subtitle ? ` · ${method.subtitle}` : ""}
              </span>
            );
          }}
          emptyState={
            <p className="px-2 py-4 text-center text-sm text-neutral-500">
              No assets configured.
            </p>
          }
          buttonProps={{
            id: "accepted-payment-methods",
            className: "h-10 w-full max-w-md justify-between",
            textWrapperClassName: "min-w-0 flex-1 text-left",
          }}
        />
      </SettingsSection>

      <SettingsSection
        title="Settlement asset"
        description="The asset your settlement wallet receives after cross-asset payments."
        helpText="Cross-asset payments settle on-chain into this asset via Stellar path payments."
      >
        <Combobox
          selected={settlementOption}
          setSelected={(option: ComboboxOption | null) => {
            if (option) {
              void setSettlement(option.value);
            }
          }}
          options={enabledOptions}
          placeholder="Select settlement asset"
          searchPlaceholder="Search assets..."
          matchTriggerWidth
          optionDescription={(option) => {
            const method = option.meta as SerializedPaymentMethod | undefined;
            return method?.subtitle ?? null;
          }}
          emptyState={
            <p className="px-2 py-4 text-center text-sm text-neutral-500">
              Enable at least one asset first.
            </p>
          }
          buttonProps={{
            id: "settlement-asset",
            className: "h-10 w-full max-w-md justify-between",
            textWrapperClassName: "min-w-0 flex-1 text-left",
            disabled: enabledOptions.length === 0,
          }}
        />
      </SettingsSection>

      <SettingsSection
        title="Custom assets"
        description="Add official or custom Stellar assets beyond the defaults."
        helpText={
          customMethods.length > 0
            ? "Remove custom assets you no longer accept."
            : "No custom assets configured yet."
        }
        action={
          <Button
            type="button"
            text="Add asset"
            onClick={() => setAddOpen(true)}
          />
        }
      >
        {customMethods.length > 0 ? (
          <div className="max-h-32 w-full max-w-md space-y-2 overflow-y-auto pr-1">
            {customMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-content-default truncate font-medium">
                    {method.display_name}
                  </p>
                  {method.subtitle ? (
                    <p className="text-content-subtle truncate text-xs">
                      {method.subtitle}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="text-content-subtle shrink-0 text-xs font-medium transition-colors hover:text-red-600"
                  onClick={() => void removeMethod(method.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Use Add asset to configure additional payment methods.
          </p>
        )}
      </SettingsSection>

      <AddAssetDialog
        organizationId={organizationId}
        open={addOpen}
        onOpenChange={setAddOpen}
        availableOfficialAssets={data?.available_official_assets ?? []}
        onAdded={reload}
      />
    </div>
  );
}
