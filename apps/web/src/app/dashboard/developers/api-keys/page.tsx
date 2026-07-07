import { ApiKeysPanel } from "@/components/developers/api-keys-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function ApiKeysPage() {
  const organization = await getDashboardOrganization();
  return <ApiKeysPanel organizationId={organization.id} />;
}
