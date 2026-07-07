import { WebhooksPanel } from "@/components/developers/webhooks-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function WebhooksPage() {
  const organization = await getDashboardOrganization();
  return <WebhooksPanel organizationId={organization.id} />;
}
