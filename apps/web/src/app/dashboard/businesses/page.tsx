import { BusinessesPage } from "@/components/business/businesses-page";
import { getDashboardUserId } from "@/lib/dashboard/get-organization";
import { getOrganizationsForUser } from "@/lib/organizations/service";

export default async function DashboardBusinessesPage() {
  const userId = await getDashboardUserId();
  const organizations = await getOrganizationsForUser(userId);

  return <BusinessesPage organizations={organizations} />;
}
