import { redirect, notFound } from "next/navigation";
import { getPublicInvoiceDetail } from "@/lib/invoices/service";

export default async function HostedInvoiceRedirectPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const detail = await getPublicInvoiceDetail(invoiceId);

  if (!detail) {
    notFound();
  }

  if (detail.checkoutUrl) {
    redirect(detail.checkoutUrl);
  }

  notFound();
}
