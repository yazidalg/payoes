import { SettlementsListPanel } from "@/components/settlements/settlements-list-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function SettlementsPage() {
  const organization = await getDashboardOrganization();

  return (
    <SettlementsListPanel
      organizationId={organization.id}
      environment={organization.environment}
    />
  );
}
