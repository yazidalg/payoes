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
import { WEBHOOK_EVENTS } from "@/constants/webhooks/events";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateWebhookDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (webhookId: string) => void;
};

export function CreateWebhookDialog({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: CreateWebhookDialogProps) {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setUrl("");
    setSecret(null);
    setError(null);
  }

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
      endpoint?: { id: string; secret?: string };
    };

    if (!response.ok) {
      setError(data.error ?? "Unable to create webhook");
      setIsLoading(false);
      return;
    }

    setSecret(data.endpoint?.secret ?? null);
    toast.success("Webhook endpoint created");
    onCreated?.(data.endpoint?.id ?? "");
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
          <DialogTitle>Add webhook endpoint</DialogTitle>
          <DialogDescription>
            Receive payment events at your server URL.
          </DialogDescription>
        </DialogHeader>

        {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

        {secret ? (
          <AlertBlock type="success">
            <p className="font-medium">Webhook signing secret</p>
            <code className="mt-2 block break-all rounded bg-background/80 p-2 text-xs">
              {secret}
            </code>
          </AlertBlock>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="create-webhook-url">Endpoint URL</Label>
            <Input
              id="create-webhook-url"
              placeholder="https://example.com/webhooks/payoes"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
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
                disabled={!url.trim()}
                isLoading={isLoading}
              >
                Add endpoint
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
