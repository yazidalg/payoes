import { PaymentMethodsPanel } from "@/components/payment-methods/payment-methods-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function AssetsPage() {
  const organization = await getDashboardOrganization();

  return <PaymentMethodsPanel organizationId={organization.id} />;
}
