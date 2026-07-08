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

const createInvoiceSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a valid Stellar amount")
    .optional(),
  customer_id: z.string().min(1),
  description: z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
  due_in_days: z.number().int().min(1).max(365).optional(),
  items: z.array(invoiceItemSchema).optional(),
}).refine((data) => Boolean(data.amount) || (data.items && data.items.length > 0), {
  message: "Amount or at least one item is required",
  path: ["items"],
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
      description: parsed.data.description,
      metadata: parsed.data.metadata,
      dueInDays: parsed.data.due_in_days,
      items: parsed.data.items?.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unit_amount,
      })),
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
