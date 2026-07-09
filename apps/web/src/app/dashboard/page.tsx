import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function DashboardPage() {
  const organization = await getDashboardOrganization();

  return <DashboardHome organizationId={organization.id} />;
}
