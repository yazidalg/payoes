import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCustomer,
  listCustomers,
  listCustomersPaginated,
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

const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["created_at", "email", "name"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  walletStatus: z.enum(["linked", "unlinked"]).optional(),
  emailStatus: z.enum(["present", "missing"]).optional(),
  paymentStatus: z.enum(["has_payments", "no_payments"]).optional(),
});

export async function GET(
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

  const { searchParams } = new URL(request.url);
  const parsedQuery = listCustomersQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortOrder: searchParams.get("sortOrder") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    walletStatus: searchParams.get("walletStatus") ?? undefined,
    emailStatus: searchParams.get("emailStatus") ?? undefined,
    paymentStatus: searchParams.get("paymentStatus") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const usePagination = Object.keys(parsedQuery.data).length > 0;

  if (usePagination) {
    const result = await listCustomersPaginated(
      organization.id,
      organization.environment,
      {
        page: parsedQuery.data.page,
        pageSize: parsedQuery.data.pageSize,
        sortBy: parsedQuery.data.sortBy,
        sortOrder: parsedQuery.data.sortOrder,
        search: parsedQuery.data.search,
        walletStatus: parsedQuery.data.walletStatus,
        emailStatus: parsedQuery.data.emailStatus,
        paymentStatus: parsedQuery.data.paymentStatus,
      },
    );

    return NextResponse.json({
      customers: result.customers.map(serializeCustomer),
      total: result.total,
    });
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
