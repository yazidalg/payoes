"use client";

import {
  type ApiKeyScope,
  API_KEY_RESOURCES,
  mapScopesToResource,
  scopePresets,
  scopesObjectToArray,
  type ScopePreset,
} from "@/lib/api-keys/scopes";
import type { ApiKeyRow } from "@/lib/api-keys/types";
import {
  AnimatedSizeContainer,
  Button,
  InfoTooltip,
  Modal,
  RadioGroup,
  RadioGroupItem,
  ToggleGroup,
} from "@dub/ui";
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

type ApiKeyFormData = {
  id?: string;
  name: string;
  scopes: Record<string, ApiKeyScope | "">;
};

const newApiKey: ApiKeyFormData = {
  name: "",
  scopes: { apis: "apis.all" },
};

function scopesEqual(
  a: Record<string, ApiKeyScope | "">,
  b: Record<string, ApiKeyScope | "">,
) {
  const aValues = scopesObjectToArray(a).sort().join(",");
  const bValues = scopesObjectToArray(b).sort().join(",");
  return aValues === bValues;
}

function AddEditApiKeyModal({
  organizationId,
  showAddEditApiKeyModal,
  setShowAddEditApiKeyModal,
  apiKey,
  onApiKeyCreated,
  setSelectedApiKey,
  onSaved,
}: {
  organizationId: string;
  showAddEditApiKeyModal: boolean;
  setShowAddEditApiKeyModal: Dispatch<SetStateAction<boolean>>;
  apiKey?: ApiKeyFormData;
  onApiKeyCreated?: (secret: string) => void;
  setSelectedApiKey: Dispatch<SetStateAction<ApiKeyRow | null>>;
  onSaved?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ApiKeyFormData>(apiKey || newApiKey);
  const [preset, setPreset] = useState<ScopePreset>("all_access");

  useEffect(() => {
    if (!showAddEditApiKeyModal) {
      return;
    }

    const nextData = apiKey || newApiKey;
    setData(nextData);
    setSaving(false);

    const scopeValues = scopesObjectToArray(nextData.scopes);

    if (scopeValues.includes("apis.all")) {
      setPreset("all_access");
    } else if (scopeValues.includes("apis.read")) {
      setPreset("read_only");
    } else {
      setPreset("restricted");
    }
  }, [apiKey, showAddEditApiKeyModal]);

  const endpoint = useMemo(() => {
    if (apiKey?.id) {
      return {
        method: "PATCH",
        url: `/api/organizations/${organizationId}/api-keys/${apiKey.id}`,
        successMessage: "API key updated!",
      };
    }

    return {
      method: "POST",
      url: `/api/organizations/${organizationId}/api-keys`,
      successMessage: "API key created!",
    };
  }, [apiKey?.id, organizationId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const scopes = scopesObjectToArray(data.scopes);

    if (scopes.length === 0) {
      setSaving(false);
      toast.error("Select at least one permission");
      return;
    }

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        scopes,
      }),
    });

    const result = (await response.json()) as {
      error?: string;
      secret?: string;
    };

    if (!response.ok) {
      setSaving(false);
      toast.error(result.error ?? "Unable to save API key");
      return;
    }

    toast.success(endpoint.successMessage);
    setShowAddEditApiKeyModal(false);
    setSelectedApiKey(null);
    onSaved?.();

    if (!apiKey?.id) {
      onApiKeyCreated?.(result.secret ?? "");
    }
  };

  const { name, scopes } = data;

  const buttonDisabled =
    !name.trim() ||
    (Boolean(apiKey?.id) &&
      apiKey?.name === name.trim() &&
      scopesEqual(apiKey.scopes, scopes));

  return (
    <Modal
      showModal={showAddEditApiKeyModal}
      setShowModal={setShowAddEditApiKeyModal}
      className="max-w-lg"
      onClose={() => setSelectedApiKey(null)}
    >
      <h3 className="border-b border-neutral-200 px-4 py-4 text-lg font-medium sm:px-6">
        {apiKey?.id ? "Edit" : "Create New"} API Key
      </h3>

      <form
        onSubmit={onSubmit}
        className="flex flex-col space-y-4 bg-neutral-50 px-4 py-8 text-left sm:px-10"
      >
        <div>
          <label htmlFor="api-key-name">
            <h2 className="text-sm font-medium text-neutral-900">Name</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              id="api-key-name"
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              required
              value={name}
              onChange={(event) =>
                setData({ ...data, name: event.target.value })
              }
              autoFocus
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-900">Permissions</h2>

          <ToggleGroup
            options={scopePresets}
            selected={preset}
            selectAction={(value) => {
              const nextPreset = value as ScopePreset;
              setPreset(nextPreset);

              if (nextPreset === "all_access") {
                setData({ ...data, scopes: { apis: "apis.all" } });
              } else if (nextPreset === "read_only") {
                setData({ ...data, scopes: { apis: "apis.read" } });
              } else {
                setData({ ...data, scopes: {} });
              }
            }}
            className="grid grid-cols-3 rounded-md border border-neutral-300 bg-neutral-100"
            optionClassName="w-full h-8 flex items-center justify-center text-sm text-neutral-800"
            indicatorClassName="rounded-md bg-white border border-neutral-300 shadow-sm"
          />
        </div>

        <AnimatedSizeContainer height>
          <div className="p-1 pt-0 text-sm text-neutral-500">
            This API key will have{" "}
            <span className="font-medium text-neutral-700">
              {scopePresets.find((item) => item.value === preset)?.description}
            </span>
          </div>
          {preset === "restricted" ? (
            <div className="flex flex-col divide-y text-sm">
              {API_KEY_RESOURCES.map((resource) => (
                <div
                  className="flex items-center justify-between py-4"
                  key={resource.key}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-neutral-800">
                      {resource.name}
                    </span>
                    <InfoTooltip content={resource.description} />
                  </div>
                  <div>
                    <RadioGroup
                      value={scopes[resource.key] || ""}
                      className="flex gap-4"
                      onValueChange={(value: ApiKeyScope | "") => {
                        setData({
                          ...data,
                          scopes: {
                            ...scopes,
                            [resource.key]: value,
                          },
                        });
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="" id={`${resource.key}-none`} />
                        <label htmlFor={`${resource.key}-none`}>None</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={`${resource.key}.read`}
                          id={`${resource.key}-read`}
                        />
                        <label
                          htmlFor={`${resource.key}-read`}
                          className="text-sm font-normal capitalize text-neutral-800"
                        >
                          Read
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={`${resource.key}.write`}
                          id={`${resource.key}-write`}
                        />
                        <label
                          htmlFor={`${resource.key}-write`}
                          className="text-sm font-normal capitalize text-neutral-800"
                        >
                          Write
                        </label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </AnimatedSizeContainer>

        <Button
          text={apiKey?.id ? "Save changes" : "Create API key"}
          disabled={buttonDisabled}
          loading={saving}
        />
      </form>
    </Modal>
  );
}

export function useAddEditApiKeyModal({
  organizationId,
  apiKey,
  onApiKeyCreated,
  setSelectedApiKey,
  onSaved,
}: {
  organizationId: string;
  apiKey?: ApiKeyFormData;
  onApiKeyCreated?: (secret: string) => void;
  setSelectedApiKey: Dispatch<SetStateAction<ApiKeyRow | null>>;
  onSaved?: () => void;
}) {
  const [showAddEditApiKeyModal, setShowAddEditApiKeyModal] = useState(false);

  const AddEditApiKeyModalCallback = useCallback(() => {
    return (
      <AddEditApiKeyModal
        organizationId={organizationId}
        showAddEditApiKeyModal={showAddEditApiKeyModal}
        setShowAddEditApiKeyModal={setShowAddEditApiKeyModal}
        apiKey={apiKey}
        onApiKeyCreated={onApiKeyCreated}
        setSelectedApiKey={setSelectedApiKey}
        onSaved={onSaved}
      />
    );
  }, [
    organizationId,
    showAddEditApiKeyModal,
    apiKey,
    onApiKeyCreated,
    setSelectedApiKey,
    onSaved,
  ]);

  return useMemo(
    () => ({
      setShowAddEditApiKeyModal,
      AddEditApiKeyModal: AddEditApiKeyModalCallback,
    }),
    [setShowAddEditApiKeyModal, AddEditApiKeyModalCallback],
  );
}

export function apiKeyRowToFormData(apiKey: ApiKeyRow): ApiKeyFormData {
  return {
    id: apiKey.id,
    name: apiKey.name,
    scopes: mapScopesToResource(apiKey.scopes ?? ["apis.all"]),
  };
}
