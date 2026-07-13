"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { useAsyncData } from "@/hooks/use-async-data";
import type { ApiKeyRow } from "@/lib/api-keys/types";
import { ApiKeyDetailSkeleton } from "@/ui/developers/api-key-detail-skeleton";
import { ApiKeyStatus } from "@/ui/developers/api-key-status";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import {
  Button,
  CopyText,
  Input,
  Label,
  MaxWidthWrapper,
  Popover,
  useCopyToClipboard,
} from "@dub/ui";
import {
  ChevronRight,
  CircleCheck,
  Copy,
  DatabaseKey,
  Dots,
  Key,
  Trash,
} from "@dub/ui/icons";
import { formatDate, timeAgo } from "@dub/utils";

export function ApiKeyDetailPanel({
  organizationId,
  apiKeyId,
}: {
  organizationId: string;
  apiKeyId: string;
}) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchApiKey = useCallback(async () => {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/api-keys/${apiKeyId}`,
    );
    const data = (await response.json()) as {
      apiKey?: ApiKeyRow;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "API key not found");
    }

    if (!data.apiKey) {
      throw new Error("API key not found");
    }

    setName(data.apiKey.name);
    return data.apiKey;
  }, [organizationId, apiKeyId, refreshKey]);

  const { data: apiKey, error, isLoading } = useAsyncData(fetchApiKey, [
    organizationId,
    apiKeyId,
    refreshKey,
  ]);

  const headerOverride = useMemo(() => {
    if (!apiKey) {
      return null;
    }

    return {
      title: (
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href="/dashboard/developers/api-keys"
            aria-label="Back to API keys"
            title="Back to API keys"
            className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
          >
            <DatabaseKey className="size-4" />
          </Link>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <span className="text-content-emphasis min-w-0 truncate text-base font-semibold">
            {apiKey.name}
          </span>
          <ApiKeyStatus apiKey={apiKey} />
        </div>
      ),
      controls: (
        <ApiKeyActionsMenu
          apiKey={apiKey}
          organizationId={organizationId}
          onRevoked={() => {
            setRefreshKey((current) => current + 1);
          }}
        />
      ),
    };
  }, [apiKey, organizationId]);

  useSetDashboardPageHeader(headerOverride);

  async function handleSave() {
    if (!apiKey || apiKey.revokedAt) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);

    const response = await apiFetch(
      `/api/organizations/${organizationId}/api-keys/${apiKeyId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      },
    );

    const data = (await response.json()) as { error?: string };

    setIsSaving(false);

    if (!response.ok) {
      toast.error(data.error ?? "Unable to update API key");
      return;
    }

    toast.success("API key updated");
    setRefreshKey((current) => current + 1);
  }

  if (isLoading) {
    return <ApiKeyDetailSkeleton />;
  }

  if (error || !apiKey) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/developers/api-keys"
          className="bg-bg-subtle hover:bg-bg-emphasis inline-flex size-8 items-center justify-center rounded-lg transition-colors"
        >
          <DatabaseKey className="size-4" />
        </Link>
        <AlertBlock type="error">{error ?? "API key not found"}</AlertBlock>
      </div>
    );
  }

  const isRevoked = Boolean(apiKey.revokedAt);

  return (
    <MaxWidthWrapper className="max-w-screen-lg space-y-6 pb-10">
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-md border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2.5">
            <Key className="size-6 text-neutral-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-neutral-700">{apiKey.name}</p>
            <CopyText
              value={apiKey.keyPrefix}
              className="font-mono text-xs text-neutral-500"
            >
              {apiKey.keyPrefix}
            </CopyText>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key-name">Name</Label>
            <Input
              id="api-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isRevoked}
              className="max-w-md"
            />
          </div>

          {!isRevoked ? (
            <Button
              type="button"
              variant="primary"
              text="Save changes"
              className="h-9"
              loading={isSaving}
              disabled={!name.trim() || name.trim() === apiKey.name}
              onClick={() => void handleSave()}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-6 md:grid-cols-2">
        <DetailField label="Status">
          <ApiKeyStatus apiKey={apiKey} />
        </DetailField>
        <DetailField label="Environment" className="capitalize">
          {apiKey.environment}
        </DetailField>
        <DetailField label="Key prefix">
          <span className="font-mono text-sm text-neutral-600">
            {apiKey.keyPrefix}
          </span>
        </DetailField>
        <DetailField label="API key ID">
          <CopyText value={apiKey.id} className="font-mono text-xs">
            {apiKey.id}
          </CopyText>
        </DetailField>
        <DetailField label="Created">
          {formatDate(apiKey.createdAt, { month: "short" })}
        </DetailField>
        <DetailField label="Last used">
          {apiKey.lastUsedAt
            ? timeAgo(new Date(apiKey.lastUsedAt))
            : "Never"}
        </DetailField>
        {apiKey.revokedAt ? (
          <DetailField label="Revoked">
            {formatDate(new Date(apiKey.revokedAt), { month: "short" })}
          </DetailField>
        ) : null}
      </div>
    </MaxWidthWrapper>
  );
}

function DetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{label}</p>
      <div className={`mt-1 text-sm text-neutral-900 ${className ?? ""}`}>
        {children}
      </div>
    </div>
  );
}

function ApiKeyActionsMenu({
  apiKey,
  organizationId,
  onRevoked,
}: {
  apiKey: ApiKeyRow;
  organizationId: string;
  onRevoked: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  async function handleRevoke() {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/api-keys/${apiKey.id}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      toast.error("Unable to revoke API key");
      return;
    }

    toast.success("API key revoked");
    setIsOpen(false);
    onRevoked();
  }

  async function handleCopyId() {
    await toast.promise(copyToClipboard(apiKey.id), {
      success: "API key ID copied",
    });
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      align="end"
      content={
        <div className="w-screen sm:w-48">
          <div className="grid gap-px p-2">
            <Button
              type="button"
              text="Copy API key ID"
              variant="outline"
              icon={
                copiedId ? (
                  <CircleCheck className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )
              }
              className="h-9 justify-start px-2"
              onClick={() => void handleCopyId()}
            />
          </div>

          {!apiKey.revokedAt ? (
            <>
              <div className="h-px w-full bg-neutral-200" />
              <div className="grid gap-px p-2">
                <Button
                  type="button"
                  text="Revoke API key"
                  variant="danger-outline"
                  icon={<Trash className="size-4" />}
                  className="h-9 justify-start px-2"
                  onClick={() => void handleRevoke()}
                />
              </div>
            </>
          ) : null}
        </div>
      }
    >
      <Button
        type="button"
        variant="outline"
        className="size-9 rounded-lg px-0"
        icon={<Dots className="size-4 text-neutral-500" />}
      />
    </Popover>
  );
}
