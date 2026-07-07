"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData } from "@/hooks/use-async-data";

const WEBHOOK_EVENTS = [
  "payment.created",
  "payment.completed",
  "payment.failed",
  "payment.expired",
] as const;

export function WebhooksPanel({ organizationId }: { organizationId: string }) {
  type WebhookEndpoint = {
    id: string;
    url: string;
    events: string[];
    enabled: number;
    createdAt: string;
    secret?: string;
  };

  type WebhookDelivery = {
    id: string;
    event: string;
    status: string;
    responseStatus: number | null;
    url: string;
    createdAt: string;
  };

  const fetchWebhooks = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/webhooks`);
    const data = (await response.json()) as {
      endpoints?: WebhookEndpoint[];
      deliveries?: WebhookDelivery[];
    };

    return {
      endpoints: data.endpoints ?? [],
      deliveries: data.deliveries ?? [],
    };
  }, [organizationId]);

  const { data, reload } = useAsyncData(fetchWebhooks, [organizationId]);
  const endpoints = data?.endpoints ?? [];
  const deliveries = data?.deliveries ?? [];
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch(`/api/organizations/${organizationId}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        events: [...WEBHOOK_EVENTS],
      }),
    });

    const data = (await response.json()) as {
      error?: string;
      endpoint?: { secret?: string };
    };

    if (!response.ok) {
      setError(data.error ?? "Unable to create webhook");
      setIsLoading(false);
      return;
    }

    setSecret(data.endpoint?.secret ?? null);
    setUrl("");
    toast.success("Webhook endpoint created");
    reload();
    setIsLoading(false);
  }

  async function handleDelete(webhookId: string) {
    const response = await fetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      toast.error("Unable to delete webhook");
      return;
    }

    toast.success("Webhook deleted");
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Receive real-time payment events at your server endpoint.
        </p>
      </div>

      {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

      {secret ? (
        <AlertBlock type="success">
          <p className="font-medium">Webhook signing secret</p>
          <code className="mt-2 block break-all rounded bg-background/80 p-2 text-xs">
            {secret}
          </code>
        </AlertBlock>
      ) : null}

      <div className="rounded-xl border border-border/80 p-4">
        <div className="space-y-3">
          <Label htmlFor="webhook-url">Endpoint URL</Label>
          <Input
            id="webhook-url"
            placeholder="https://example.com/webhooks/payoes"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!url.trim() || isLoading}
            isLoading={isLoading}
          >
            Add endpoint
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Events</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {endpoints.map((endpoint) => (
              <tr key={endpoint.id} className="border-t border-border/60">
                <td className="px-4 py-3">{endpoint.url}</td>
                <td className="px-4 py-3">{endpoint.events.length} events</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDelete(endpoint.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Recent deliveries</h2>
        <div className="overflow-hidden rounded-xl border border-border/80">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Response</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No deliveries yet.
                  </td>
                </tr>
              ) : (
                deliveries.map((delivery) => (
                  <tr key={delivery.id} className="border-t border-border/60">
                    <td className="px-4 py-3">{delivery.event}</td>
                    <td className="px-4 py-3 capitalize">{delivery.status}</td>
                    <td className="px-4 py-3">
                      {delivery.responseStatus ?? "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
