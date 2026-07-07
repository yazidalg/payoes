import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCustomer,
  listCustomers,
  serializeCustomer,
} from "@/lib/customers/service";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

const createCustomerSchema = z.object({
  email: z.string().email().optional().nullable(),
  name: z.string().max(200).optional().nullable(),
  primary_stellar_address: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
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

  const customerList = await listCustomers(
    organization.id,
    organization.environment
  );

  return NextResponse.json({
    customers: customerList.map(serializeCustomer),
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
  const parsed = createCustomerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const customer = await createCustomer({
      organizationId: organization.id,
      environment: organization.environment,
      email: parsed.data.email,
      name: parsed.data.name,
      primaryStellarAddress: parsed.data.primary_stellar_address,
      notes: parsed.data.notes,
      metadata: parsed.data.metadata,
    });

    return NextResponse.json(serializeCustomer(customer), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create customer",
      },
      { status: 400 }
    );
  }
}
