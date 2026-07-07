import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCustomerByPublicId,
  listPaymentsForCustomer,
  serializeCustomer,
  updateCustomer,
} from "@/lib/customers/service";
import { serializePayments } from "@/lib/payments/service";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

const updateCustomerSchema = z.object({
  email: z.string().email().optional().nullable(),
  name: z.string().max(200).optional().nullable(),
  primary_stellar_address: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, customerId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const customer = await getCustomerByPublicId(customerId);

  if (!customer || customer.organizationId !== organization.id) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const paymentList = await listPaymentsForCustomer(customer.id);

  return NextResponse.json({
    customer: serializeCustomer(customer),
    payments: await serializePayments(paymentList),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, customerId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const customer = await getCustomerByPublicId(customerId);

  if (!customer || customer.organizationId !== organization.id) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateCustomerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const updated = await updateCustomer(customer, {
      email: parsed.data.email,
      name: parsed.data.name,
      primaryStellarAddress: parsed.data.primary_stellar_address,
      notes: parsed.data.notes,
      metadata: parsed.data.metadata,
    });

    return NextResponse.json(serializeCustomer(updated));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update customer",
      },
      { status: 400 }
    );
  }
}
