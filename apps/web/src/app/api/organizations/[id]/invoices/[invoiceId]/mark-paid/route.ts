import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { buildInvoiceActivity } from "@/lib/invoices/activity";
import { getInvoiceDetail, markInvoiceAsPaid, serializeInvoice } from "@/lib/invoices/service";
import { getHostedInvoiceUrl } from "@/lib/invoices/url";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, invoiceId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const invoice = await markInvoiceAsPaid(
      invoiceId,
      organization.id,
      organization.environment
    );

    const detail = await getInvoiceDetail(
      invoiceId,
      organization.id,
      organization.environment
    );

    if (!detail) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const serialized = serializeInvoice(
      { ...detail.invoice, customerPublicId: detail.customerPublicId },
      {
        checkoutUrl: detail.checkoutUrl,
        checkoutSessionPublicId: detail.checkoutSessionPublicId,
        items: detail.items,
        hostedInvoiceUrl: getHostedInvoiceUrl(detail.invoice.publicId),
        customerName: detail.customerName,
        customerEmail: detail.customerEmail,
      }
    );

    return NextResponse.json({
      ...serialized,
      activity: buildInvoiceActivity({
        status: serialized.status,
        created_at: serialized.created_at,
        updated_at: serialized.updated_at,
        sent_at: serialized.sent_at,
        paid_at: serialized.paid_at,
        checkout_session_id: serialized.checkout_session_id,
        customer_email: serialized.customer_email,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to mark invoice as paid",
      },
      { status: 400 }
    );
  }
}
