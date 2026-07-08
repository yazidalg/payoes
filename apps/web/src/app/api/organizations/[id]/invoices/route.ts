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
import {
  fiatAmountPattern,
  resolveInvoiceCurrencyCode,
} from "@/lib/invoices/currencies";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

const createInvoiceSchema = z
  .object({
    amount: z.string().optional(),
    customer_id: z.string().min(1),
    currency_code: z.string().optional(),
    description: z.string().max(500).optional().nullable(),
    metadata: z.record(z.string(), z.string()).optional().nullable(),
    due_at: z.string().datetime().optional(),
    due_in_days: z.number().int().min(1).max(365).optional(),
    items: z
      .array(
        z.object({
          description: z.string().min(1).max(500),
          quantity: z
            .string()
            .regex(/^\d+(\.\d{1,4})?$/, "Quantity must be a valid number"),
          unit_amount: z.string().min(1),
        })
      )
      .optional(),
  })
  .refine((data) => Boolean(data.amount) || (data.items && data.items.length > 0), {
    message: "Amount or at least one item is required",
    path: ["items"],
  })
  .superRefine((data, ctx) => {
    const currencyCode = resolveInvoiceCurrencyCode(data.currency_code);
    const amountPattern = fiatAmountPattern(currencyCode);

    if (data.amount && !amountPattern.test(data.amount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Amount must be a valid ${currencyCode} amount`,
        path: ["amount"],
      });
    }

    for (const [index, item] of (data.items ?? []).entries()) {
      if (!amountPattern.test(item.unit_amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unit amount must be a valid ${currencyCode} amount`,
          path: ["items", index, "unit_amount"],
        });
      }
    }
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

  const currencyCode = resolveInvoiceCurrencyCode(parsed.data.currency_code);

  try {
    const invoice = await createInvoice({
      organizationId: organization.id,
      environment: organization.environment,
      customerId: parsed.data.customer_id,
      amount: parsed.data.amount,
      currencyCode,
      description: parsed.data.description,
      metadata: parsed.data.metadata,
      dueAt: parsed.data.due_at ? new Date(parsed.data.due_at) : undefined,
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
