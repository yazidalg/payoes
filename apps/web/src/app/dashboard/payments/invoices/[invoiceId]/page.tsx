import { InvoiceDetailPanel } from "@/components/payments/invoice-detail-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const organization = await getDashboardOrganization();
  const { invoiceId } = await params;

  return (
    <InvoiceDetailPanel organizationId={organization.id} invoiceId={invoiceId} />
  );
}
