import { ApiLogsListPanel } from "@/components/developers/api-logs-list-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function ApiLogsPage() {
  const organization = await getDashboardOrganization();
  return <ApiLogsListPanel organizationId={organization.id} />;
}
