"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData } from "@/hooks/use-async-data";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  environment: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export function ApiKeysPanel({ organizationId }: { organizationId: string }) {
  const fetchKeys = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/api-keys`);
    const data = (await response.json()) as { apiKeys?: ApiKeyRow[] };
    return data.apiKeys ?? [];
  }, [organizationId]);

  const { data: keys, reload: reloadKeys } = useAsyncData(fetchKeys, [organizationId]);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch(`/api/organizations/${organizationId}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = (await response.json()) as { error?: string; secret?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to create API key");
      setIsLoading(false);
      return;
    }

    setSecret(data.secret ?? null);
    setName("");
    toast.success("API key created");
    reloadKeys();
    setIsLoading(false);
  }

  async function handleRevoke(keyId: string) {
    const response = await fetch(
      `/api/organizations/${organizationId}/api-keys/${keyId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      toast.error("Unable to revoke API key");
      return;
    }

    toast.success("API key revoked");
    reloadKeys();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create credentials to call the Payoes API from your application.
        </p>
      </div>

      {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

      {secret ? (
        <AlertBlock type="success">
          <p className="font-medium">Copy your API key now. It will not be shown again.</p>
          <code className="mt-2 block break-all rounded bg-background/80 p-2 text-xs">
            {secret}
          </code>
        </AlertBlock>
      ) : null}

      <div className="rounded-xl border border-border/80 p-4">
        <div className="space-y-3">
          <Label htmlFor="api-key-name">Key name</Label>
          <Input
            id="api-key-name"
            placeholder="Production backend"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!name.trim() || isLoading}
            isLoading={isLoading}
          >
            Create API key
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Prefix</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(keys ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No API keys yet.
                </td>
              </tr>
            ) : (
              (keys ?? []).map((key) => (
                <tr key={key.id} className="border-t border-border/60">
                  <td className="px-4 py-3">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{key.keyPrefix}</td>
                  <td className="px-4 py-3 capitalize">
                    {key.revokedAt ? "revoked" : "active"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!key.revokedAt ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRevoke(key.id)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
