import { SettlementsTable } from "@/components/settlements/settlements-table";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function SettlementsPage() {
  const organization = await getDashboardOrganization();

  return (
    <SettlementsTable
      organizationId={organization.id}
      environment={organization.environment}
    />
  );
}
