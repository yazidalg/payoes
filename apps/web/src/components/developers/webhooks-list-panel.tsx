"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { CreateWebhookDialog } from "@/components/developers/create-webhook-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAsyncData } from "@/hooks/use-async-data";
import type { WebhookEndpointRow } from "@/lib/webhooks/types";

export function WebhooksListPanel({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchEndpoints = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/webhooks`);
    const data = (await response.json()) as { endpoints?: WebhookEndpointRow[] };
    return data.endpoints ?? [];
  }, [organizationId]);

  const { data: endpoints, reload } = useAsyncData(fetchEndpoints, [organizationId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage endpoints that receive payment events.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          <PlusIcon />
          Add endpoint
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint list</CardTitle>
          <CardDescription>
            Click a row to view deliveries and endpoint details.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">Events</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(endpoints ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No webhook endpoints yet.
                    </td>
                  </tr>
                ) : (
                  (endpoints ?? []).map((endpoint) => (
                    <tr
                      key={endpoint.id}
                      className="border-t border-border/60 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/dashboard/developers/webhooks/${endpoint.id}`}
                          className="break-all hover:underline"
                        >
                          {endpoint.url}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{endpoint.events.length} events</td>
                      <td className="px-4 py-3 capitalize">
                        {endpoint.enabled ? "enabled" : "disabled"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateWebhookDialog
        organizationId={organizationId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(webhookId) => {
          reload();
          if (webhookId) {
            router.push(`/dashboard/developers/webhooks/${webhookId}`);
          }
        }}
      />
    </div>
  );
}
