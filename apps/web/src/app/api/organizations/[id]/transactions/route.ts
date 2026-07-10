import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listCompletedPayments,
  listTransactionsPaginated,
  serializePayments,
} from "@/lib/payments/service";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";

const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  customerStatus: z.enum(["has_customer", "no_customer"]).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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
  const parsedQuery = listTransactionsQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sortOrder: searchParams.get("sortOrder") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    customerStatus: searchParams.get("customerStatus") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const hasListParams =
    parsedQuery.data.page !== undefined ||
    parsedQuery.data.pageSize !== undefined ||
    parsedQuery.data.search !== undefined ||
    parsedQuery.data.customerStatus !== undefined ||
    parsedQuery.data.sortOrder !== undefined;

  if (hasListParams) {
    const result = await listTransactionsPaginated(
      organization.id,
      organization.environment,
      parsedQuery.data,
    );

    return NextResponse.json(result);
  }

  const transactions = await listCompletedPayments(
    organization.id,
    organization.environment,
  );

  return NextResponse.json({
    transactions: await serializePayments(transactions),
  });
}
