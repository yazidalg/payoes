import { PaymentLinksPanel } from "@/components/payments/payment-links-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function PaymentLinksPage() {
  const organization = await getDashboardOrganization();
  return <PaymentLinksPanel organizationId={organization.id} />;
}
