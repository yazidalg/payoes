import { PaymentLinkDetailPanel } from "@/components/payments/payment-link-detail-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function PaymentLinkDetailPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const organization = await getDashboardOrganization();
  const { linkId } = await params;

  return (
    <PaymentLinkDetailPanel organizationId={organization.id} linkId={linkId} />
  );
}
