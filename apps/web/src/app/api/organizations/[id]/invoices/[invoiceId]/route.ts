import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildInvoiceActivity } from "@/lib/invoices/activity";
import {
  changeInvoiceCustomer,
  deleteInvoice,
  getInvoiceDetail,
  serializeInvoice,
  updateInvoice,
} from "@/lib/invoices/service";
import { getHostedInvoiceUrl } from "@/lib/invoices/url";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

const updateInvoiceSchema = z.object({
  description: z.string().nullable().optional(),
  due_at: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.string()).nullable().optional(),
  customer_id: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.string().min(1),
        unit_amount: z.string().min(1),
      })
    )
    .optional(),
});

async function getSerializedInvoice(
  organizationId: string,
  environment: "sandbox" | "production",
  invoiceId: string
) {
  const detail = await getInvoiceDetail(invoiceId, organizationId, environment);

  if (!detail) {
    return null;
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

  return {
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
  };
}

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

  const invoice = await getSerializedInvoice(
    organization.id,
    organization.environment,
    invoiceId
  );

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(
  request: Request,
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

  const body = updateInvoiceSchema.parse(await request.json());

  try {
    if (body.customer_id) {
      await changeInvoiceCustomer(
        invoiceId,
        organization.id,
        organization.environment,
        body.customer_id
      );
    }

    if (
      body.description !== undefined ||
      body.due_at !== undefined ||
      body.metadata !== undefined ||
      body.items !== undefined
    ) {
      await updateInvoice(invoiceId, organization.id, organization.environment, {
        description: body.description,
        dueAt: body.due_at ? new Date(body.due_at) : undefined,
        metadata: body.metadata,
        items: body.items?.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitAmount: item.unit_amount,
        })),
      });
    }

    const invoice = await getSerializedInvoice(
      organization.id,
      organization.environment,
      invoiceId
    );

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update invoice",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
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
    await deleteInvoice(invoiceId, organization.id, organization.environment);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete invoice",
      },
      { status: 400 }
    );
  }
}
