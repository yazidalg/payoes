import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getInvoiceDetail, serializeInvoice } from "@/lib/invoices/service";
import { getHostedInvoiceUrl } from "@/lib/invoices/url";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

export async function GET(
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

  const detail = await getInvoiceDetail(
    invoiceId,
    organization.id,
    organization.environment
  );

  if (!detail) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  let subscriptionPublicId: string | null = null;

  if (detail.invoice.subscriptionId) {
    const { subscriptions } = await import("@/lib/db/schema");
    const { db } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    const [sub] = await db
      .select({ publicId: subscriptions.publicId })
      .from(subscriptions)
      .where(eq(subscriptions.id, detail.invoice.subscriptionId))
      .limit(1);

    subscriptionPublicId = sub?.publicId ?? null;
  }

  return NextResponse.json(
    serializeInvoice(
      { ...detail.invoice, customerPublicId: detail.customerPublicId },
      {
        checkoutUrl: detail.checkoutUrl,
        checkoutSessionPublicId: detail.checkoutSessionPublicId,
        subscriptionPublicId,
        items: detail.items,
        hostedInvoiceUrl: getHostedInvoiceUrl(detail.invoice.publicId),
      }
    )
  );
}
