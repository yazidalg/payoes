"use client";

import { useState, type ReactNode } from "react";
import { WebhookDetailHeader } from "@/ui/developers/webhook-detail-header";

export function WebhookDetailLayout({
  organizationId,
  webhookId,
  children,
}: {
  organizationId: string;
  webhookId: string;
  children: ReactNode;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <WebhookDetailHeader
        organizationId={organizationId}
        webhookId={webhookId}
        onUpdated={() => setRefreshKey((current) => current + 1)}
      />
      <div key={refreshKey}>{children}</div>
    </div>
  );
}
