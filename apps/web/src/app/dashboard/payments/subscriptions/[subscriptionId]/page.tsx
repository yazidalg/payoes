import { SubscriptionDetailPanel } from "@/components/payments/subscription-detail-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>;
}) {
  const organization = await getDashboardOrganization();
  const { subscriptionId } = await params;

  return (
    <SubscriptionDetailPanel
      organizationId={organization.id}
      subscriptionId={subscriptionId}
    />
  );
}
