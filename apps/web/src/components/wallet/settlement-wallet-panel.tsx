"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AddAssetDialog } from "@/components/payment-methods/add-asset-dialog";
import { TrustlineSetupDialog } from "@/components/wallet/trustline-setup-dialog";
import { useSettlementWalletConnection } from "@/hooks/use-settlement-wallet-connection";
import { useTrustlineSetup, type MissingTrustlineAsset } from "@/hooks/use-trustline-setup";
import { useAsyncData } from "@/hooks/use-async-data";
import type { Organization } from "@/lib/db/schema";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { SerializedPaymentMethod } from "@/lib/payment-methods/service";
import { SettingsSection } from "@/ui/settings/settings-section";
import { ConnectedWallet } from "@/ui/wallet/connected-wallet";
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

function enabledIdsFromMethods(methods: SerializedPaymentMethod[]) {
  return new Set(
    methods.filter((method) => method.is_enabled).map((method) => method.id),
  );
}

export function SettlementWalletPanel({
  organizationId,
  environment,
  initialAddress = null,
}: {
  organizationId: string;
  environment: Organization["environment"];
  initialAddress?: string | null;
}) {
  const router = useRouter();
  const [savedAddress, setSavedAddress] = useState<string | null>(initialAddress);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [savedMethods, setSavedMethods] = useState<SerializedPaymentMethod[] | null>(
    null,
  );
  const [draftMethods, setDraftMethods] = useState<SerializedPaymentMethod[] | null>(
    null,
  );
  const [savedSettlementAssetId, setSavedSettlementAssetId] = useState<
    string | null
  >(null);
  const [draftSettlementAssetId, setDraftSettlementAssetId] = useState<
    string | null
  >(null);
  const [isSavingAccepted, setIsSavingAccepted] = useState(false);
  const [isCheckingAcceptedTrustlines, setIsCheckingAcceptedTrustlines] =
    useState(false);
  const [isSavingSettlementAsset, setIsSavingSettlementAsset] = useState(false);
  const [acceptedSaveTrustlineOpen, setAcceptedSaveTrustlineOpen] = useState(false);
  const [acceptedSaveMissingAssets, setAcceptedSaveMissingAssets] = useState<
    MissingTrustlineAsset[]
  >([]);
  const [pendingAcceptedMethodIds, setPendingAcceptedMethodIds] = useState<
    string[]
  >([]);

  const {
    networkError,
    connectError,
    isConnecting,
    isReady,
    connect,
    networkLabel,
  } = useSettlementWalletConnection(environment);

  const isConfigured = Boolean(savedAddress);

  const {
    missingAssets,
    hasMissing: hasMissingTrustlines,
    isDialogOpen: isTrustlineDialogOpen,
    isAdding: isAddingTrustlines,
    error: trustlineError,
    addTrustlines,
    dismiss: dismissTrustlineDialog,
    checkTrustlines,
  } = useTrustlineSetup({
    organizationId,
    address: savedAddress,
    environment,
    enabled: isConfigured,
  });

  const fetchMethods = useCallback(async () => {
    const response = await apiFetch(`/api/organizations/${organizationId}/payment-methods`);
    const payload = await readJsonResponse<PaymentMethodsResponse & { error?: string }>(
      response,
    );

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load payment settings");
    }

    return payload;
  }, [organizationId]);

  const {
    data,
    error: methodsError,
    isLoading: isLoadingMethods,
    reload,
  } = useAsyncData(fetchMethods, [organizationId]);

  useEffect(() => {
    setSavedAddress(initialAddress);
  }, [initialAddress]);

  useEffect(() => {
    if (!data) {
      return;
    }

    setSavedMethods(data.payment_methods);
    setDraftMethods(data.payment_methods);
    setSavedSettlementAssetId(data.settlement_asset_id);
    setDraftSettlementAssetId(data.settlement_asset_id);
  }, [data]);

  const methods = draftMethods ?? data?.payment_methods ?? [];

  const allOptions = useMemo(
    () => methods.map(toOption),
    [methods],
  );

  const enabledOptions = useMemo(
    () => methods.filter((method) => method.is_enabled).map(toOption),
    [methods],
  );

  const customMethods = useMemo(
    () => methods.filter((method) => !method.is_official),
    [methods],
  );

  const draftSettlementOption = useMemo(() => {
    if (!draftSettlementAssetId) {
      return null;
    }

    return (
      enabledOptions.find((option) => option.value === draftSettlementAssetId) ??
      null
    );
  }, [draftSettlementAssetId, enabledOptions]);

  const isAcceptedDirty = useMemo(() => {
    if (!savedMethods || !draftMethods) {
      return false;
    }

    const savedEnabledIds = enabledIdsFromMethods(savedMethods);
    const draftEnabledIds = enabledIdsFromMethods(draftMethods);

    if (savedEnabledIds.size !== draftEnabledIds.size) {
      return true;
    }

    for (const id of savedEnabledIds) {
      if (!draftEnabledIds.has(id)) {
        return true;
      }
    }

    return false;
  }, [savedMethods, draftMethods]);

  const isSettlementAssetDirty =
    draftSettlementAssetId !== savedSettlementAssetId;

  const displayError = walletError ?? networkError ?? connectError;
  const isWalletBusy = isConnecting || isSavingWallet;

  async function persistWallet(targetAddress: string, provider: string | null) {
    setWalletError(null);
    setIsSavingWallet(true);

    const response = await apiFetch(
      `/api/organizations/${organizationId}/settlement-wallet`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stellarAddress: targetAddress,
          walletProvider: provider,
        }),
      },
    );

    const payload = (await response.json()) as {
      error?: string;
      wallet?: {
        stellarAddress: string;
        walletProvider: string | null;
      };
    };

    setIsSavingWallet(false);

    if (!response.ok) {
      setWalletError(payload.error ?? "Unable to save settlement wallet.");
      return false;
    }

    setSavedAddress(payload.wallet?.stellarAddress ?? targetAddress);
    toast.success(
      initialAddress ? "Settlement wallet updated" : "Settlement wallet saved",
    );
    router.refresh();
    return true;
  }

  async function handleConnectAndSave() {
    setWalletError(null);

    const connection = await connect();

    if (!connection) {
      return;
    }

    await persistWallet(connection.address, connection.provider);
  }

  async function handleAddTrustlines() {
    if (!savedAddress) {
      return;
    }

    const added = await addTrustlines();

    if (added) {
      return;
    }

    const connection = await connect();

    if (!connection || connection.address !== savedAddress) {
      setWalletError(
        "Connect the settlement wallet in your browser extension to add trustlines.",
      );
      return;
    }

    await addTrustlines();
  }

  async function toggleMethod(methodId: string, enabled: boolean) {
    const response = await apiFetch(
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

  function handleAcceptedDraftChange(nextSelected: ComboboxOption[]) {
    if (!draftMethods) {
      return;
    }

    if (
      savedSettlementAssetId &&
      !nextSelected.some((option) => option.value === savedSettlementAssetId)
    ) {
      toast.error("Settlement asset must stay in accepted payment methods");
      return;
    }

    const nextIds = new Set(nextSelected.map((option) => option.value));

    setDraftMethods(
      draftMethods.map((method) => ({
        ...method,
        is_enabled: nextIds.has(method.id),
      })),
    );
  }

  async function checkMissingTrustlinesForMethods(methodIds: string[]) {
    if (!savedAddress || methodIds.length === 0) {
      return [] as MissingTrustlineAsset[];
    }

    const response = await apiFetch(
      `/api/organizations/${organizationId}/settlement-wallet/trustlines`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          sourcePublicKey: savedAddress,
          environment,
          enabled_method_ids: methodIds,
        }),
      },
    );

    const payload = (await response.json()) as {
      missing?: MissingTrustlineAsset[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to check trustlines");
    }

    return payload.missing ?? [];
  }

  function cancelAcceptedSaveTrustlines() {
    if (savedMethods) {
      setDraftMethods(savedMethods);
    }

    setAcceptedSaveTrustlineOpen(false);
    setAcceptedSaveMissingAssets([]);
    setPendingAcceptedMethodIds([]);
  }

  async function persistAcceptedChanges() {
    if (!savedMethods || !draftMethods) {
      return;
    }

    const savedEnabledIds = enabledIdsFromMethods(savedMethods);
    const draftEnabledIds = enabledIdsFromMethods(draftMethods);
    const changes = draftMethods.filter(
      (method) => savedEnabledIds.has(method.id) !== draftEnabledIds.has(method.id),
    );

    if (changes.length === 0) {
      return;
    }

    setIsSavingAccepted(true);

    try {
      await Promise.all(
        changes.map((method) =>
          toggleMethod(method.id, draftEnabledIds.has(method.id)),
        ),
      );
      setSavedMethods(draftMethods);
      toast.success("Accepted assets saved");
      reload();
      void checkTrustlines();
    } catch (syncError) {
      toast.error(
        syncError instanceof Error
          ? syncError.message
          : "Unable to update accepted payment methods",
      );
      if (savedMethods) {
        setDraftMethods(savedMethods);
      }
    } finally {
      setIsSavingAccepted(false);
    }
  }

  async function handleAcceptedSaveAddTrustlines() {
    if (!savedAddress || pendingAcceptedMethodIds.length === 0) {
      return;
    }

    const added = await addTrustlines(pendingAcceptedMethodIds);

    if (!added) {
      const connection = await connect();

      if (!connection || connection.address !== savedAddress) {
        setWalletError(
          "Connect the settlement wallet in your browser extension to add trustlines.",
        );
        return;
      }

      const retried = await addTrustlines(pendingAcceptedMethodIds);

      if (!retried) {
        return;
      }
    }

    const missing = await checkMissingTrustlinesForMethods(
      pendingAcceptedMethodIds,
    );
    setAcceptedSaveMissingAssets(missing);

    if (missing.length > 0) {
      return;
    }

    setAcceptedSaveTrustlineOpen(false);
    setPendingAcceptedMethodIds([]);
    await persistAcceptedChanges();
  }

  async function handleSaveAccepted() {
    if (!savedMethods || !draftMethods || !isAcceptedDirty) {
      return;
    }

    const draftEnabledIds = Array.from(enabledIdsFromMethods(draftMethods));

    if (savedAddress && draftEnabledIds.length > 0) {
      setIsCheckingAcceptedTrustlines(true);

      try {
        const missing = await checkMissingTrustlinesForMethods(draftEnabledIds);

        if (missing.length > 0) {
          setAcceptedSaveMissingAssets(missing);
          setPendingAcceptedMethodIds(draftEnabledIds);
          setAcceptedSaveTrustlineOpen(true);
          return;
        }
      } catch (trustlineCheckError) {
        toast.error(
          trustlineCheckError instanceof Error
            ? trustlineCheckError.message
            : "Unable to check trustlines",
        );
        return;
      } finally {
        setIsCheckingAcceptedTrustlines(false);
      }
    }

    await persistAcceptedChanges();
  }

  async function handleSaveSettlementAsset() {
    if (!draftSettlementAssetId || !isSettlementAssetDirty) {
      return;
    }

    setIsSavingSettlementAsset(true);

    const response = await apiFetch(
      `/api/organizations/${organizationId}/payment-methods/settlement`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method_id: draftSettlementAssetId }),
      },
    );

    const payload = await readJsonResponse<{ error?: string }>(response);
    setIsSavingSettlementAsset(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Unable to update settlement asset");
      return;
    }

    setSavedSettlementAssetId(draftSettlementAssetId);
    toast.success("Settlement asset saved");
    reload();
  }

  async function removeMethod(methodId: string) {
    const response = await apiFetch(
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

  if (methodsError) {
    return (
      <div className="mb-6">
        <p className="text-sm text-red-600">{methodsError}</p>
      </div>
    );
  }

  if (isLoadingMethods && !data) {
    return (
      <div className="mb-6 space-y-6">
        <div className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
        <div className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
        <div className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-6">
      <TrustlineSetupDialog
        open={isTrustlineDialogOpen}
        missingAssets={missingAssets}
        isAdding={isAddingTrustlines}
        error={trustlineError}
        onConfirm={() => void handleAddTrustlines()}
        onDismiss={dismissTrustlineDialog}
      />

      <TrustlineSetupDialog
        open={acceptedSaveTrustlineOpen}
        missingAssets={acceptedSaveMissingAssets}
        isAdding={isAddingTrustlines}
        error={trustlineError}
        required
        description="Your settlement wallet needs trustlines for the accepted assets you selected. Add them to save, or cancel to keep your previous selection."
        onConfirm={() => void handleAcceptedSaveAddTrustlines()}
        onDismiss={cancelAcceptedSaveTrustlines}
        onCancel={cancelAcceptedSaveTrustlines}
      />

      <SettingsSection
        title="Settlement wallet"
        description={`Connect your ${networkLabel} wallet to receive ${environment} payments.`}
        helpText={
          isConfigured
            ? "Update the connected wallet or add trustlines for accepted assets."
            : "Connect a wallet before accepting payments."
        }
        action={
          <Button
            type="button"
            text={isConfigured ? "Update wallet" : "Connect wallet"}
            loading={isWalletBusy}
            disabled={!isReady || isWalletBusy}
            onClick={() => void handleConnectAndSave()}
          />
        }
      >
        <div className="space-y-4">
          {displayError ? (
            <p className="text-sm text-red-600">{displayError}</p>
          ) : null}

          {isConfigured ? (
            <>
              <ConnectedWallet address={savedAddress!} networkLabel={networkLabel} />

              {hasMissingTrustlines ? (
                <div className="space-y-2">
                  <p className="text-sm text-amber-700">
                    This wallet is missing trustlines for enabled payment assets.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9"
                    text="Add trustlines"
                    loading={isAddingTrustlines}
                    disabled={isAddingTrustlines || isWalletBusy}
                    onClick={() => void handleAddTrustlines()}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              No settlement wallet connected yet.
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Accepted assets"
        description="Choose which Stellar assets customers can use to pay you."
        helpText="Customers can pay using any selected asset. Settlement asset must remain selected."
        action={
          <Button
            type="button"
            text="Save changes"
            loading={isSavingAccepted || isCheckingAcceptedTrustlines}
            disabled={
              !isAcceptedDirty ||
              isSavingAccepted ||
              isCheckingAcceptedTrustlines
            }
            onClick={() => void handleSaveAccepted()}
          />
        }
      >
        <Combobox
          multiple
          selected={enabledOptions}
          setSelected={(options: ComboboxOption[]) =>
            handleAcceptedDraftChange(options)
          }
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
        titleTooltip="Cross-asset payments are converted into this asset on-chain when possible. If conversion fails (for example due to liquidity), Payoes sends the payment to your settlement wallet in the asset the customer paid with."
        description="The asset your settlement wallet receives after cross-asset payments."
        helpText="Cross-asset payments settle on-chain into this asset via Stellar path payments."
        action={
          <Button
            type="button"
            text="Save changes"
            loading={isSavingSettlementAsset}
            disabled={
              !isSettlementAssetDirty ||
              !draftSettlementAssetId ||
              isSavingSettlementAsset
            }
            onClick={() => void handleSaveSettlementAsset()}
          />
        }
      >
        <Combobox
          selected={draftSettlementOption}
          setSelected={(option: ComboboxOption | null) => {
            if (option) {
              setDraftSettlementAssetId(option.value);
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
              Enable at least one accepted asset first.
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
            ? "New assets are added disabled. Enable them in Accepted assets when ready."
            : "Add assets here, then enable them in Accepted assets."
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
