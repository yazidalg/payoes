"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { toast } from "sonner";
import { WebhookEventsPicker } from "@/components/developers/webhook-events-picker";
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
import {
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_RETRY_DELAYS_MS,
} from "@/constants/webhooks/retry";
import type { WebhookDeliveryRow, WebhookEndpointRow } from "@/lib/webhooks/types";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import { Webhook } from "@dub/ui/icons";

type WebhookDetail = {
  endpoint: WebhookEndpointRow;
  deliveries: WebhookDeliveryRow[];
};

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

function DeliveryLogRow({
  organizationId,
  webhookId,
  delivery,
  onRetried,
}: {
  organizationId: string;
  webhookId: string;
  delivery: WebhookDeliveryRow;
  onRetried: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  async function handleRetry() {
    setIsRetrying(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}/deliveries/${delivery.id}/retry`,
      { method: "POST" }
    );

    const data = (await response.json()) as { error?: string };

    setIsRetrying(false);

    if (!response.ok) {
      toast.error(data.error ?? "Unable to retry delivery");
      return;
    }

    toast.success("Delivery retried");
    onRetried();
  }

  return (
    <>
      <tr className="border-t border-border/60">
        <td className="px-4 py-3 font-mono text-xs">{delivery.event}</td>
        <td className="px-4 py-3 capitalize">{delivery.status}</td>
        <td className="px-4 py-3">
          {delivery.attempts}/{delivery.maxAttempts}
        </td>
        <td className="px-4 py-3">{delivery.responseStatus ?? "—"}</td>
        <td className="px-4 py-3 text-muted-foreground">
          {new Date(delivery.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Button>
            {delivery.status !== "delivered" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleRetry()}
                isLoading={isRetrying}
              >
                Retry
              </Button>
            ) : null}
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-border/40 bg-muted/20">
          <td colSpan={6} className="space-y-3 px-4 py-4 text-xs">
            <div>
              <p className="font-medium text-muted-foreground">Delivery ID</p>
              <p className="mt-1 font-mono">{delivery.id}</p>
            </div>
            {delivery.nextRetryAt ? (
              <div>
                <p className="font-medium text-muted-foreground">Next retry</p>
                <p className="mt-1">
                  {new Date(delivery.nextRetryAt).toLocaleString()}
                </p>
              </div>
            ) : null}
            {delivery.lastError ? (
              <div>
                <p className="font-medium text-muted-foreground">Last error</p>
                <pre className="mt-1 overflow-x-auto rounded bg-background p-2">
                  {delivery.lastError}
                </pre>
              </div>
            ) : null}
            <div>
              <p className="font-medium text-muted-foreground">Payload</p>
              <pre className="mt-1 overflow-x-auto rounded bg-background p-2">
                {JSON.stringify(delivery.payload, null, 2)}
              </pre>
            </div>
            {delivery.responseBody ? (
              <div>
                <p className="font-medium text-muted-foreground">Response body</p>
                <pre className="mt-1 overflow-x-auto rounded bg-background p-2">
                  {delivery.responseBody}
                </pre>
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function WebhookDetailPanel({
  organizationId,
  webhookId,
}: {
  organizationId: string;
  webhookId: string;
}) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);
  const [isSavingEvents, setIsSavingEvents] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const fetchWebhook = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}`
    );
    const data = (await response.json()) as WebhookDetail & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Webhook not found");
    }

    setSelectedEvents(data.endpoint.events);
    return data;
  }, [organizationId, webhookId, reloadKey]);

  const { data, error, isLoading } = useAsyncData(fetchWebhook, [
    organizationId,
    webhookId,
    reloadKey,
  ]);

  async function handleDelete() {
    const response = await fetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      toast.error("Unable to delete webhook");
      return;
    }

    toast.success("Webhook deleted");
    router.push("/dashboard/developers/webhooks");
  }

  async function handleTest() {
    setIsTesting(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}/test`,
      { method: "POST" }
    );

    const result = (await response.json()) as { error?: string };

    setIsTesting(false);

    if (!response.ok) {
      toast.error(result.error ?? "Test webhook failed");
      return;
    }

    toast.success("Test webhook sent");
    setReloadKey((current) => current + 1);
  }

  async function handleRotateSecret() {
    setIsRotating(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}/rotate-secret`,
      { method: "POST" }
    );

    const result = (await response.json()) as { secret?: string; error?: string };

    setIsRotating(false);

    if (!response.ok || !result.secret) {
      toast.error(result.error ?? "Unable to rotate secret");
      return;
    }

    setRotatedSecret(result.secret);
    toast.success("Webhook secret rotated");
  }

  async function handleSaveEvents() {
    setIsSavingEvents(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: selectedEvents }),
      }
    );

    const result = (await response.json()) as { error?: string };

    setIsSavingEvents(false);

    if (!response.ok) {
      toast.error(result.error ?? "Unable to update events");
      return;
    }

    toast.success("Subscribed events updated");
    setReloadKey((current) => current + 1);
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading webhook...</div>
    );
  }

  if (error || !data?.endpoint) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href="/dashboard/developers/webhooks" />}
        >
          <ArrowLeftIcon />
          Back to webhooks
        </Button>
        <AlertBlock type="error">{error ?? "Webhook not found"}</AlertBlock>
      </div>
    );
  }

  const { endpoint, deliveries } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/developers/webhooks" />}
          >
            <ArrowLeftIcon />
            Back to webhooks
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight break-all">
              {endpoint.url}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {endpoint.events.length} subscribed events
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleTest()}
            isLoading={isTesting}
          >
            Send test event
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleDelete()}>
            Delete endpoint
          </Button>
        </div>
      </div>

      {rotatedSecret ? (
        <AlertBlock type="success">
          <p className="font-medium">New webhook signing secret</p>
          <code className="mt-2 block break-all rounded bg-background/80 p-2 text-xs">
            {rotatedSecret}
          </code>
        </AlertBlock>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signing secret</CardTitle>
            <CardDescription>
              Used to verify `Payoes-Signature` on incoming requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Current secret</p>
              <p className="mt-1 font-mono text-sm">
                {endpoint.secretPreview ?? "••••••••"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleRotateSecret()}
              isLoading={isRotating}
            >
              Rotate secret
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retry policy</CardTitle>
            <CardDescription>
              Failed deliveries are retried automatically with exponential backoff.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Maximum attempts: {WEBHOOK_MAX_ATTEMPTS}</li>
              <li>
                Retry delays:{" "}
                {WEBHOOK_RETRY_DELAYS_MS.map(formatRetryDelay).join(" → ")}
              </li>
              <li>Signature tolerance: 5 minutes</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscribed events</CardTitle>
          <CardDescription>
            Choose which payment events this endpoint receives.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <WebhookEventsPicker
            value={selectedEvents}
            onChange={setSelectedEvents}
          />
          <Button
            type="button"
            onClick={() => void handleSaveEvents()}
            isLoading={isSavingEvents}
          >
            Save events
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery logs</CardTitle>
          <CardDescription>
            Recent webhook delivery attempts, responses, and retries.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {deliveries.length === 0 ? (
            <TableEmptyState
              title="No deliveries yet"
              description="Send a test event to verify your endpoint."
              icon={<Webhook className="size-4 text-neutral-700" />}
              className="border-0 md:min-h-[240px]"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Event</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Attempts</th>
                    <th className="px-4 py-3 font-medium">Response</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((delivery) => (
                    <DeliveryLogRow
                      key={delivery.id}
                      organizationId={organizationId}
                      webhookId={webhookId}
                      delivery={delivery}
                      onRetried={() => setReloadKey((current) => current + 1)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
