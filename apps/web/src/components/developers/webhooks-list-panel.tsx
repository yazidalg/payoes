"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateWebhookDialog } from "@/components/developers/create-webhook-dialog";
import { WebhooksList } from "@/ui/developers/webhooks-list";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import { Button } from "@dub/ui";
import { Plus2 } from "@dub/ui/icons";

export function WebhooksListPanel({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title:
          "Webhooks allow you to receive HTTP requests whenever a payment event occurs in Payoes.",
        href: "/dashboard/developers/documentation",
      },
      controls: (
        <Button
          type="button"
          variant="primary"
          text="Create webhook"
          icon={<Plus2 className="size-4" />}
          className="h-9 w-fit"
          onClick={() => setIsCreateOpen(true)}
        />
      ),
    }),
    [],
  );

  useSetDashboardPageHeader(headerOverride);

  return (
    <>
      <WebhooksList organizationId={organizationId} refreshKey={refreshKey} />

      <CreateWebhookDialog
        organizationId={organizationId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(webhookId) => {
          setRefreshKey((current) => current + 1);
          if (webhookId) {
            router.push(`/dashboard/developers/webhooks/${webhookId}`);
          }
        }}
      />
    </>
  );
}
