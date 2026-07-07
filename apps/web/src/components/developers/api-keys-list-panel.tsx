"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { CreateApiKeyDialog } from "@/components/developers/create-api-key-dialog";
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

export function ApiKeysListPanel({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchKeys = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/api-keys`);
    const data = (await response.json()) as { apiKeys?: ApiKeyRow[] };
    return data.apiKeys ?? [];
  }, [organizationId]);

  const { data: keys, reload } = useAsyncData(fetchKeys, [organizationId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage credentials used to call the Payoes API.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          <PlusIcon />
          Create API key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API key list</CardTitle>
          <CardDescription>Click a row to open the key detail page.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Prefix</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(keys ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No API keys yet.
                    </td>
                  </tr>
                ) : (
                  (keys ?? []).map((key) => (
                    <tr
                      key={key.id}
                      className="border-t border-border/60 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/dashboard/developers/api-keys/${key.id}`}
                          className="hover:underline"
                        >
                          {key.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{key.keyPrefix}</td>
                      <td className="px-4 py-3 capitalize">
                        {key.revokedAt ? "revoked" : "active"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateApiKeyDialog
        organizationId={organizationId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(apiKeyId) => {
          reload();
          if (apiKeyId) {
            router.push(`/dashboard/developers/api-keys/${apiKeyId}`);
          }
        }}
      />
    </div>
  );
}
