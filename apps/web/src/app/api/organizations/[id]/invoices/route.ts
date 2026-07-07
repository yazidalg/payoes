import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createInvoice,
  getInvoiceDetail,
  listInvoices,
  serializeInvoice,
  serializeInvoices,
} from "@/lib/invoices/service";
import { ACCEPTED_ASSET_OPTIONS } from "@/lib/organizations/wallet-constants";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

const createInvoiceSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a valid Stellar amount"),
  asset: z.enum(ACCEPTED_ASSET_OPTIONS),
  customer_id: z.string().min(1),
  description: z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
  due_in_days: z.number().int().min(1).max(365).optional(),
});

export async function GET(
  _request: Request,
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

  const rows = await listInvoices(organization.id, organization.environment);

  return NextResponse.json({
    invoices: await serializeInvoices(rows),
  });
}

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
  const parsed = createInvoiceSchema.safeParse(body);

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
      amount: parsed.data.amount,
      asset: parsed.data.asset,
      description: parsed.data.description,
      metadata: parsed.data.metadata,
      dueInDays: parsed.data.due_in_days,
    });

    const detail = await getInvoiceDetail(
      invoice.publicId,
      organization.id,
      organization.environment
    );

    if (!detail) {
      return NextResponse.json(
        { error: "Unable to load created invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      serializeInvoice(
        { ...detail.invoice, customerPublicId: detail.customerPublicId },
        {
          checkoutUrl: detail.checkoutUrl,
          checkoutSessionPublicId: detail.checkoutSessionPublicId,
        }
      ),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create invoice",
      },
      { status: 400 }
    );
  }
}
