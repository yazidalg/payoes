"use client";

import { useMemo, useState } from "react";
import { ApiKeysTable } from "@/ui/developers/api-keys-table";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import {
  apiKeyRowToFormData,
  useAddEditApiKeyModal,
} from "@/ui/modals/add-edit-api-key-modal";
import { useApiKeyCreatedModal } from "@/ui/modals/api-key-created-modal";
import type { ApiKeyRow } from "@/lib/api-keys/types";
import { Button } from "@dub/ui";
import { Plus2 } from "@dub/ui/icons";

export function ApiKeysListPanel({ organizationId }: { organizationId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [createdSecret, setCreatedSecret] = useState("");
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKeyRow | null>(null);

  const { ApiKeyCreatedModal, setShowApiKeyCreatedModal } = useApiKeyCreatedModal({
    secret: createdSecret,
  });

  const onApiKeyCreated = (secret: string) => {
    setCreatedSecret(secret);
    setShowApiKeyCreatedModal(true);
  };

  const { AddEditApiKeyModal, setShowAddEditApiKeyModal } = useAddEditApiKeyModal({
    organizationId,
    ...(selectedApiKey
      ? { apiKey: apiKeyRowToFormData(selectedApiKey) }
      : { onApiKeyCreated }),
    setSelectedApiKey,
    onSaved: () => setRefreshKey((current) => current + 1),
  });

  const openCreateModal = () => {
    setSelectedApiKey(null);
    setShowAddEditApiKeyModal(true);
  };

  const openEditModal = (apiKey: ApiKeyRow) => {
    if (apiKey.revokedAt) {
      return;
    }

    setSelectedApiKey(apiKey);
    setShowAddEditApiKeyModal(true);
  };

  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title:
          "These API keys allow other apps to access your organization. Use them with caution: do not share your API key with others, or expose it in the browser or other client-side code.",
        href: "/dashboard/developers/documentation",
      },
      controls: (
        <Button
          type="button"
          variant="primary"
          text="Create API key"
          icon={<Plus2 className="size-4" />}
          className="h-9 w-fit"
          onClick={openCreateModal}
        />
      ),
    }),
    [],
  );

  useSetDashboardPageHeader(headerOverride);

  return (
    <>
      <ApiKeyCreatedModal />
      <AddEditApiKeyModal />

      <ApiKeysTable
        organizationId={organizationId}
        refreshKey={refreshKey}
        onCreateClick={openCreateModal}
        onRowClick={openEditModal}
        onEdit={openEditModal}
        onRevoked={() => setRefreshKey((current) => current + 1)}
      />
    </>
  );
}
