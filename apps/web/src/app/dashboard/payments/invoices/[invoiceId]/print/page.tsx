import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { InvoicePrintClient } from "@/components/invoices/invoice-print-client";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";
import { buildInvoicePresentation, getInvoiceDetail } from "@/lib/invoices/service";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const organization = await getDashboardOrganization();
  const { invoiceId } = await params;
  const detail = await getInvoiceDetail(
    invoiceId,
    organization.id,
    organization.environment
  );

  if (!detail) {
    notFound();
  }

  const presentation = await buildInvoicePresentation(detail.invoice, {
    checkoutUrl: detail.checkoutUrl,
  });

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <InvoicePrintClient />
      <div className="mx-auto max-w-4xl print:max-w-none">
        <InvoiceDocument presentation={presentation} />
      </div>
    </div>
  );
}
