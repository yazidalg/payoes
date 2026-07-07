"use client";

import { useCallback } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAsyncData } from "@/hooks/use-async-data";
import type { ApiKeyRow } from "@/lib/api-keys/types";

export function ApiKeyDetailPanel({
  organizationId,
  apiKeyId,
}: {
  organizationId: string;
  apiKeyId: string;
}) {
  const fetchApiKey = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/api-keys/${apiKeyId}`
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

    return data.apiKey;
  }, [organizationId, apiKeyId]);

  const { data: apiKey, error, isLoading, reload } = useAsyncData(fetchApiKey, [
    organizationId,
    apiKeyId,
  ]);

  async function handleRevoke() {
    const response = await fetch(
      `/api/organizations/${organizationId}/api-keys/${apiKeyId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      toast.error("Unable to revoke API key");
      return;
    }

    toast.success("API key revoked");
    reload();
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading API key...</div>
    );
  }

  if (error || !apiKey) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href="/dashboard/developers/api-keys" />}
        >
          <ArrowLeftIcon />
          Back to API keys
        </Button>
        <AlertBlock type="error">{error ?? "API key not found"}</AlertBlock>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/developers/api-keys" />}
          >
            <ArrowLeftIcon />
            Back to API keys
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{apiKey.name}</h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {apiKey.keyPrefix}
            </p>
          </div>
        </div>
        {!apiKey.revokedAt ? (
          <Button type="button" variant="outline" onClick={() => void handleRevoke()}>
            Revoke key
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key details</CardTitle>
          <CardDescription>Environment, usage, and status.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1 capitalize">
                {apiKey.revokedAt ? "revoked" : "active"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Environment</dt>
              <dd className="mt-1 capitalize">{apiKey.environment}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last used</dt>
              <dd className="mt-1">
                {apiKey.lastUsedAt
                  ? new Date(apiKey.lastUsedAt).toLocaleString()
                  : "Never"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-1">
                {new Date(apiKey.createdAt).toLocaleString()}
              </dd>
            </div>
            {apiKey.revokedAt ? (
              <div>
                <dt className="text-muted-foreground">Revoked</dt>
                <dd className="mt-1">
                  {new Date(apiKey.revokedAt).toLocaleString()}
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
