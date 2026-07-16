import { Suspense } from "react";
import { ShopifyIntegrationPanel } from "@/components/integrations/shopify-integration-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function ShopifyIntegrationPage() {
  const organization = await getDashboardOrganization();
  return (
    <Suspense fallback={null}>
      <ShopifyIntegrationPanel organizationId={organization.id} />
    </Suspense>
  );
}
