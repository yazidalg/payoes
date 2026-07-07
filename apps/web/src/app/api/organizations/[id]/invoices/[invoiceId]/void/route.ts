import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { voidInvoice, serializeInvoice } from "@/lib/invoices/service";
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
    const invoice = await voidInvoice(invoiceId, organization.id);

    return NextResponse.json(serializeInvoice(invoice));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to void invoice",
      },
      { status: 400 }
    );
  }
}
