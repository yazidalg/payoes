import { WebhookDetailPanel } from "@/components/developers/webhook-detail-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function WebhookDetailPage({
  params,
}: {
  params: Promise<{ webhookId: string }>;
}) {
  const organization = await getDashboardOrganization();
  const { webhookId } = await params;

  return (
    <WebhookDetailPanel organizationId={organization.id} webhookId={webhookId} />
  );
}
