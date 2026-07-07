import { CustomersListPanel } from "@/components/customers/customers-list-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function CustomersPage() {
  const organization = await getDashboardOrganization();
  return <CustomersListPanel organizationId={organization.id} />;
}
