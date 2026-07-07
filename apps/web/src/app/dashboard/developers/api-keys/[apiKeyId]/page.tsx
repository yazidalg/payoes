import { ApiKeyDetailPanel } from "@/components/developers/api-key-detail-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function ApiKeyDetailPage({
  params,
}: {
  params: Promise<{ apiKeyId: string }>;
}) {
  const organization = await getDashboardOrganization();
  const { apiKeyId } = await params;

  return (
    <ApiKeyDetailPanel organizationId={organization.id} apiKeyId={apiKeyId} />
  );
}
