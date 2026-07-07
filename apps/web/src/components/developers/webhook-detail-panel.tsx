"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import type { WebhookDeliveryRow, WebhookEndpointRow } from "@/lib/webhooks/types";

type WebhookDetail = {
  endpoint: WebhookEndpointRow;
  deliveries: WebhookDeliveryRow[];
};

export function WebhookDetailPanel({
  organizationId,
  webhookId,
}: {
  organizationId: string;
  webhookId: string;
}) {
  const router = useRouter();

  const fetchWebhook = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}`
    );
    const data = (await response.json()) as WebhookDetail & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Webhook not found");
    }

    return data;
  }, [organizationId, webhookId]);

  const { data, error, isLoading } = useAsyncData(fetchWebhook, [
    organizationId,
    webhookId,
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
        <Button type="button" variant="outline" onClick={() => void handleDelete()}>
          Delete endpoint
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint details</CardTitle>
          <CardDescription>Subscribed events and status.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1 capitalize">
                {endpoint.enabled ? "enabled" : "disabled"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-1">
                {new Date(endpoint.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">Events</dt>
              <dd className="mt-1">{endpoint.events.join(", ")}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent deliveries</CardTitle>
          <CardDescription>
            Delivery attempts for this endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Response</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
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
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(delivery.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
