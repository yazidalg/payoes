import { OrganizationsPage } from "@/components/organizations/organizations-page";
import { getDashboardUserId } from "@/lib/dashboard/get-organization";
import { getOrganizationsForUser } from "@/lib/organizations/service";

export default async function DashboardOrganizationsPage() {
  const userId = await getDashboardUserId();
  const organizations = await getOrganizationsForUser(userId);

  return <OrganizationsPage organizations={organizations} />;
}
