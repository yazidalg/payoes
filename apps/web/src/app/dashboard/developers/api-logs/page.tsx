import { ApiLogsTable } from "@/components/developers/api-logs-table";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function ApiLogsPage() {
  const organization = await getDashboardOrganization();
  return <ApiLogsTable organizationId={organization.id} />;
}
