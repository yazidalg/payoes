import { Suspense } from "react";
import { PaymentsHubPanel } from "@/components/payments/payments-hub-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function PaymentsPage() {
  const organization = await getDashboardOrganization();

  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground">Loading payments...</div>
      }
    >
      <PaymentsHubPanel organizationId={organization.id} />
    </Suspense>
  );
}
