import { PaymentDetailPanel } from "@/components/payments/payment-detail-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const organization = await getDashboardOrganization();
  const { paymentId } = await params;

  return (
    <PaymentDetailPanel
      organizationId={organization.id}
      paymentId={paymentId}
    />
  );
}
