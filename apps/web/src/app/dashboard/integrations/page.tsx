import { IntegrationsListPanel } from "@/components/integrations/integrations-list-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function IntegrationsPage() {
  const organization = await getDashboardOrganization();
  return <IntegrationsListPanel organizationId={organization.id} />;
}
