import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  getInvoiceDetail,
  sendInvoice,
  serializeInvoice,
} from "@/lib/invoices/service";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";

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
    const result = await sendInvoice(
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
      return NextResponse.json(
        { error: "Unable to load sent invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...serializeInvoice(
        { ...detail.invoice, customerPublicId: detail.customerPublicId },
        {
          checkoutUrl: result.checkoutUrl,
          checkoutSessionPublicId: detail.checkoutSessionPublicId,
        }
      ),
      email_delivered: result.emailDelivered,
      email_logged: result.emailLogged,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to send invoice",
      },
      { status: 400 }
    );
  }
}
