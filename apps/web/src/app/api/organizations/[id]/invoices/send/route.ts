import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createInvoice,
  getInvoiceDetail,
  getInvoicePaymentAssets,
  sendInvoice,
  serializeInvoice,
} from "@/lib/invoices/service";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

const invoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Quantity must be a valid number"),
  unit_amount: z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, "Unit amount must be a valid Stellar amount"),
});

const sendInvoiceSchema = z.object({
  customer_id: z.string().min(1),
  description: z.string().max(500).optional().nullable(),
  due_in_days: z.number().int().min(1).max(365).optional(),
  items: z.array(invoiceItemSchema).min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = sendInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const invoice = await createInvoice({
      organizationId: organization.id,
      environment: organization.environment,
      customerId: parsed.data.customer_id,
      description: parsed.data.description,
      dueInDays: parsed.data.due_in_days,
      items: parsed.data.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unit_amount,
      })),
    });

    const result = await sendInvoice(
      invoice.publicId,
      organization.id,
      organization.environment
    );

    const detail = await getInvoiceDetail(
      invoice.publicId,
      organization.id,
      organization.environment
    );

    if (!detail) {
      return NextResponse.json(
        { error: "Unable to load sent invoice" },
        { status: 500 }
      );
    }

    const paymentAssets = await getInvoicePaymentAssets(detail.invoice);

    return NextResponse.json({
      ...serializeInvoice(
        { ...detail.invoice, customerPublicId: detail.customerPublicId },
        {
          checkoutUrl: result.checkoutUrl,
          checkoutSessionPublicId: detail.checkoutSessionPublicId,
          settlementAsset: paymentAssets.settlement_asset.asset_code,
          allowedAssets: paymentAssets.allowed_assets.map((a) => a.asset_code),
        }
      ),
      email_delivered: result.emailDelivered,
      email_logged: result.emailLogged,
      items: detail.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_amount: item.unitAmount,
      })),
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
