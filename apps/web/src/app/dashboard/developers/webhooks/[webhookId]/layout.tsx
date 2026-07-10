import type { ReactNode } from "react";
import { WebhookDetailLayout } from "@/components/developers/webhook-detail-layout";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function WebhookDetailLayoutPage({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ webhookId: string }>;
}) {
  const organization = await getDashboardOrganization();
  const { webhookId } = await params;

  return (
    <WebhookDetailLayout organizationId={organization.id} webhookId={webhookId}>
      {children}
    </WebhookDetailLayout>
  );
}
