import { PaymentsPanel } from "@/components/payments/payments-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function PaymentsPage() {
  const organization = await getDashboardOrganization();
  return <PaymentsPanel organizationId={organization.id} />;
}
