import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  type InvoicePresentation,
  renderInvoiceEmailHtml,
} from "@/lib/invoices/presentation";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";

const presentationSchema = z.object({
  invoiceNumber: z.string(),
  status: z.string(),
  amount: z.string(),
  asset: z.string(),
  currencyCode: z.string(),
  description: z.string().nullable(),
  dueAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  environmentLabel: z.string().nullable().optional(),
  organization: z.object({
    name: z.string(),
    logoUrl: z.string().nullable(),
    logoInitials: z.string(),
  }),
  customer: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
  items: z.array(
    z.object({
      id: z.string().optional(),
      description: z.string(),
      quantity: z.string(),
      unitAmount: z.string(),
      lineAmount: z.string(),
    }),
  ),
  allowedAssets: z.array(z.string()).optional(),
  checkoutUrl: z.string().nullable().optional(),
});

function parsePresentation(
  input: z.infer<typeof presentationSchema>,
): InvoicePresentation {
  return {
    ...input,
    dueAt: input.dueAt ? new Date(input.dueAt) : null,
    createdAt: new Date(input.createdAt),
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const { id: organizationId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organization = await getOrganizationForMember(
    organizationId,
    session.user.id,
  );

  if (!organization) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = presentationSchema.safeParse(body.presentation);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preview payload" }, { status: 400 });
  }

  try {
    const html = await renderInvoiceEmailHtml(parsePresentation(parsed.data));
    return NextResponse.json({ html });
  } catch {
    return NextResponse.json(
      { error: "Unable to render email preview" },
      { status: 500 },
    );
  }
}
