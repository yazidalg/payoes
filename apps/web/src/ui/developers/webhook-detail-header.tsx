"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { toast } from "sonner";
import { useAsyncData } from "@/hooks/use-async-data";
import type { WebhookEndpointRow } from "@/lib/webhooks/types";
import { WebhookAvatar } from "@/ui/developers/webhook-avatar";
import { WebhookStatus } from "@/ui/developers/webhook-status";
import { getWebhookLabel } from "@/ui/developers/webhook-utils";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import {
  Button,
  MaxWidthWrapper,
  Popover,
  TabSelect,
  useCopyToClipboard,
} from "@dub/ui";
import { Send } from "lucide-react";
import {
  CircleCheck,
  CircleXmark,
  Copy,
  Dots,
  Trash,
} from "@dub/ui/icons";

export function WebhookDetailHeader({
  organizationId,
  webhookId,
  onUpdated,
}: {
  organizationId: string;
  webhookId: string;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

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

    return data.endpoint;
  }, [organizationId, webhookId]);

  const { data: endpoint, isLoading, reload } = useAsyncData(fetchEndpoint, [
    organizationId,
    webhookId,
  ]);

  const baseHref = `/dashboard/developers/webhooks/${webhookId}`;

  const tabOptions = useMemo(
    () => [
      {
        id: "logs" as const,
        label: "Event Logs",
        href: baseHref,
      },
      {
        id: "edit" as const,
        label: "Configuration",
        href: `${baseHref}/edit`,
      },
    ],
    [baseHref],
  );

  const selectedTab = segment === "edit" ? "edit" : "logs";

  async function handleCopyId() {
    await toast.promise(copyToClipboard(webhookId), {
      success: "Webhook ID copied",
    });
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  async function handleTest() {
    setIsTesting(true);

    const response = await apiFetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}/test`,
      { method: "POST" },
    );

    const result = (await response.json()) as { error?: string };

    setIsTesting(false);

    if (!response.ok) {
      toast.error(result.error ?? "Test webhook failed");
      return;
    }

    toast.success("Test webhook sent");
    onUpdated?.();
    reload();
  }

  async function handleToggleEnabled() {
    if (!endpoint) {
      return;
    }

    setIsToggling(true);

    const response = await apiFetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !endpoint.enabled }),
      },
    );

    setIsToggling(false);

    if (!response.ok) {
      toast.error("Unable to update webhook");
      return;
    }

    toast.success(endpoint.enabled ? "Webhook disabled" : "Webhook enabled");
    reload();
    onUpdated?.();
    setIsOpen(false);
  }

  async function handleDelete() {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      toast.error("Unable to delete webhook");
      return;
    }

    toast.success("Webhook deleted");
    router.push("/dashboard/developers/webhooks");
  }

  return (
    <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
      <Link
        href="/dashboard/developers/webhooks"
        className="text-sm text-neutral-500 transition-colors hover:text-neutral-800"
      >
        Back to webhooks
      </Link>

      <div className="flex justify-between gap-8 sm:items-center">
        {isLoading || !endpoint ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SmoothSkeleton className="size-12 rounded-md" />
            <div className="flex flex-col gap-2">
              <SmoothSkeleton className="h-5 w-28" />
              <SmoothSkeleton className="h-3 w-48" />
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-fit flex-none rounded-md border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2">
              <WebhookAvatar id={endpoint.url} className="size-8" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-700">
                  {getWebhookLabel(endpoint.url)}
                </span>
                <WebhookStatus endpoint={endpoint} />
              </div>
              <a
                href={endpoint.url}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-1 break-all text-sm text-neutral-500 underline-offset-4 hover:text-neutral-700 hover:underline"
              >
                {endpoint.url}
              </a>
            </div>
          </div>
        )}

        <Popover
          openPopover={isOpen}
          setOpenPopover={setIsOpen}
          align="end"
          content={
            <div className="w-screen sm:w-48">
              <div className="grid gap-px p-2">
                <Button
                  type="button"
                  text="Copy Webhook ID"
                  variant="outline"
                  icon={
                    copiedId ? (
                      <CircleCheck className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )
                  }
                  className="h-9 justify-start px-2"
                  onClick={() => void handleCopyId()}
                />
                <Button
                  type="button"
                  text="Send test event"
                  variant="outline"
                  icon={<Send className="size-4" />}
                  className="h-9 justify-start px-2"
                  loading={isTesting}
                  onClick={() => void handleTest()}
                />
              </div>

              <div className="h-px w-full bg-neutral-200" />

              <div className="grid gap-px p-2">
                <Button
                  type="button"
                  text={endpoint?.enabled ? "Disable webhook" : "Enable webhook"}
                  variant="outline"
                  icon={
                    endpoint?.enabled ? (
                      <CircleXmark className="size-4" />
                    ) : (
                      <CircleCheck className="size-4" />
                    )
                  }
                  className="h-9 justify-start px-2"
                  loading={isToggling}
                  onClick={() => void handleToggleEnabled()}
                />
                <Button
                  type="button"
                  text="Delete webhook"
                  variant="danger-outline"
                  icon={<Trash className="size-4" />}
                  className="h-9 justify-start px-2"
                  onClick={() => void handleDelete()}
                />
              </div>
            </div>
          }
        >
          <Button
            type="button"
            variant="outline"
            className="size-9 rounded-lg px-0"
            icon={<Dots className="size-4 text-neutral-500" />}
          />
        </Popover>
      </div>

      <div className="-ml-1.5 border-b border-neutral-200">
        <TabSelect
          options={tabOptions}
          selected={selectedTab}
          className="gap-2"
        />
      </div>
    </MaxWidthWrapper>
  );
}
