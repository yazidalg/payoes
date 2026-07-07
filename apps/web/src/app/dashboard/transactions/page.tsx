import { TransactionsTable } from "@/components/transactions/transactions-table";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function TransactionsPage() {
  const organization = await getDashboardOrganization();
  return <TransactionsTable organizationId={organization.id} />;
}
