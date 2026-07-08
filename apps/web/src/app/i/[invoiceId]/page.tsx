import { HostedInvoiceClient } from "@/components/invoices/hosted-invoice-client";

export default async function HostedInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  return <HostedInvoiceClient invoiceId={invoiceId} />;
}
