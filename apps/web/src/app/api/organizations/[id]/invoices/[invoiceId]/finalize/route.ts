import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { finalizeInvoice, serializeInvoice } from "@/lib/invoices/service";
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
    const result = await finalizeInvoice(
      invoiceId,
      organization.id,
      organization.environment
    );

    return NextResponse.json({
      invoice: serializeInvoice(result.invoice, {
        checkoutUrl: result.checkoutUrl,
        checkoutSessionPublicId: result.session.publicId,
      }),
      checkout_url: result.checkoutUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to finalize invoice",
      },
      { status: 400 }
    );
  }
}
