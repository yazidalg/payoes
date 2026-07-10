"use client";

import { useState } from "react";
import { toast } from "sonner";
import { WebhookEventsPicker } from "@/components/developers/webhook-events-picker";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { WEBHOOK_EVENTS } from "@/constants/webhooks/events";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppModal } from "@/ui/modals/app-modal";

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
  const [events, setEvents] = useState<string[]>([...WEBHOOK_EVENTS]);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setUrl("");
    setEvents([...WEBHOOK_EVENTS]);
    setSecret(null);
    setError(null);
  }

  async function handleCreate() {
    setError(null);

    if (events.length === 0) {
      setError("Select at least one event");
      return;
    }

    setIsLoading(true);

    const response = await fetch(`/api/organizations/${organizationId}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events }),
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
    <AppModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
          return;
        }
        onOpenChange(nextOpen);
      }}
      title="Add webhook endpoint"
      description="Receive signed HTTP callbacks when payment events occur."
      className="max-h-[90vh] overflow-y-auto"
      footer={
        secret ? (
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
        )
      }
    >
      {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

      {secret ? (
        <AlertBlock type="success">
          <p className="font-medium">Webhook signing secret</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Copy this secret now. You will not be able to view it again.
          </p>
          <code className="mt-2 block break-all rounded bg-background/80 p-2 text-xs">
            {secret}
          </code>
        </AlertBlock>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-webhook-url">Endpoint URL</Label>
            <Input
              id="create-webhook-url"
              placeholder="https://example.com/webhooks/payoes"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <WebhookEventsPicker value={events} onChange={setEvents} />
        </div>
      )}
    </AppModal>
  );
}
