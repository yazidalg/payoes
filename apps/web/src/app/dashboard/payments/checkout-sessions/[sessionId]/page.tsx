import { CheckoutSessionDetailPanel } from "@/components/payments/checkout-session-detail-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function CheckoutSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const organization = await getDashboardOrganization();
  const { sessionId } = await params;

  return (
    <CheckoutSessionDetailPanel
      organizationId={organization.id}
      sessionId={sessionId}
    />
  );
}
