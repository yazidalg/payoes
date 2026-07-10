import { WebhookConfigurationPanel } from "@/ui/developers/webhook-configuration-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function WebhookConfigurationPage({
  params,
}: {
  params: Promise<{ webhookId: string }>;
}) {
  const organization = await getDashboardOrganization();
  const { webhookId } = await params;

  return (
    <WebhookConfigurationPanel
      organizationId={organization.id}
      webhookId={webhookId}
    />
  );
}
