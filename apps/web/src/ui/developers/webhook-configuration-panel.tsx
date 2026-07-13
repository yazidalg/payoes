"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { WebhookEventsPicker } from "@/components/developers/webhook-events-picker";
import { AlertBlock } from "@/components/shared/alert-block";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_RETRY_DELAYS_MS,
} from "@/constants/webhooks/retry";
import type { WebhookEndpointRow } from "@/lib/webhooks/types";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import {
  Button,
  CopyButton,
  Input,
  Label,
  MaxWidthWrapper,
} from "@dub/ui";

function formatRetryDelay(ms: number) {
  if (ms < 60_000) {
    return `${ms / 1000}s`;
  }

  if (ms < 3_600_000) {
    return `${ms / 60_000}m`;
  }

  if (ms < 86_400_000) {
    return `${ms / 3_600_000}h`;
  }

  return `${ms / 86_400_000}d`;
}

export function WebhookConfigurationPanel({
  organizationId,
  webhookId,
}: {
  organizationId: string;
  webhookId: string;
}) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchEndpoint = useCallback(async () => {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}`,
    );
    const data = (await response.json()) as {
      endpoint?: WebhookEndpointRow;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Webhook not found");
    }

    if (!data.endpoint) {
      throw new Error("Webhook not found");
    }

    setUrl(data.endpoint.url);
    setEvents(data.endpoint.events);
    return data.endpoint;
  }, [organizationId, webhookId, refreshKey]);

  const { data: endpoint, isLoading } = useAsyncData(fetchEndpoint, [
    organizationId,
    webhookId,
    refreshKey,
  ]);

  async function handleSave() {
    if (events.length === 0) {
      toast.error("Select at least one event");
      return;
    }

    setIsSaving(true);

    const response = await apiFetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events }),
      },
    );

    const result = (await response.json()) as { error?: string };

    setIsSaving(false);

    if (!response.ok) {
      toast.error(result.error ?? "Unable to update webhook");
      return;
    }

    toast.success("Webhook updated");
    setRefreshKey((current) => current + 1);
  }

  async function handleRotateSecret() {
    setIsRotating(true);

    const response = await apiFetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}/rotate-secret`,
      { method: "POST" },
    );

    const result = (await response.json()) as { secret?: string; error?: string };

    setIsRotating(false);

    if (!response.ok || !result.secret) {
      toast.error(result.error ?? "Unable to rotate secret");
      return;
    }

    setRotatedSecret(result.secret);
    toast.success("Webhook secret rotated");
    setRefreshKey((current) => current + 1);
  }

  if (isLoading || !endpoint) {
    return (
      <MaxWidthWrapper className="max-w-screen-lg space-y-6 pb-10">
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
          <SmoothSkeleton className="h-4 w-16" />
          <SmoothSkeleton className="h-10 w-full max-w-lg" />
          <SmoothSkeleton className="h-4 w-20" />
          <SmoothSkeleton className="h-10 w-full max-w-lg" />
          <SmoothSkeleton className="h-32 w-full" />
        </div>
      </MaxWidthWrapper>
    );
  }

  return (
    <MaxWidthWrapper className="max-w-screen-lg space-y-6 pb-10">
      {rotatedSecret ? (
        <AlertBlock type="success">
          <p className="font-medium">New webhook signing secret</p>
          <code className="mt-2 block break-all rounded bg-background/80 p-2 text-xs">
            {rotatedSecret}
          </code>
        </AlertBlock>
      ) : null}

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="max-w-lg"
            />
          </div>

          <WebhookEventsPicker value={events} onChange={setEvents} />

          <Button
            type="button"
            variant="primary"
            text="Save changes"
            className="h-9"
            loading={isSaving}
            disabled={!url.trim()}
            onClick={() => void handleSave()}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-neutral-900">
            Signing secret
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            Used to verify Payoes-Signature on incoming requests.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <code className="font-mono text-sm text-neutral-600">
              {endpoint.secretPreview ?? "••••••••"}
            </code>
            {endpoint.secretPreview ? (
              <CopyButton value={endpoint.secretPreview} className="size-8" />
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            text="Rotate secret"
            className="mt-4 h-9"
            loading={isRotating}
            onClick={() => void handleRotateSecret()}
          />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-neutral-900">Retry policy</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Failed deliveries are retried automatically with exponential backoff.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-600">
            <li>Maximum attempts: {WEBHOOK_MAX_ATTEMPTS}</li>
            <li>
              Retry delays:{" "}
              {WEBHOOK_RETRY_DELAYS_MS.map(formatRetryDelay).join(" → ")}
            </li>
            <li>Signature tolerance: 5 minutes</li>
          </ul>
        </div>
      </div>
    </MaxWidthWrapper>
  );
}
