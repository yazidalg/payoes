"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateApiKeyDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (apiKeyId: string) => void;
};

export function CreateApiKeyDialog({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: CreateApiKeyDialogProps) {
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setName("");
    setSecret(null);
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch(`/api/organizations/${organizationId}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = (await response.json()) as {
      error?: string;
      secret?: string;
      apiKey?: { id: string };
    };

    if (!response.ok) {
      setError(data.error ?? "Unable to create API key");
      setIsLoading(false);
      return;
    }

    setSecret(data.secret ?? null);
    toast.success("API key created");
    onCreated?.(data.apiKey?.id ?? "");
    setIsLoading(false);
  }

  function handleClose() {
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>
            Generate a credential for server-side Payoes API access.
          </DialogDescription>
        </DialogHeader>

        {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

        {secret ? (
          <AlertBlock type="success">
            <p className="font-medium">
              Copy your API key now. It will not be shown again.
            </p>
            <code className="mt-2 block break-all rounded bg-background/80 p-2 text-xs">
              {secret}
            </code>
          </AlertBlock>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="create-api-key-name">Key name</Label>
            <Input
              id="create-api-key-name"
              placeholder="Production backend"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          {secret ? (
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreate()}
                disabled={!name.trim()}
                isLoading={isLoading}
              >
                Create API key
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
