import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listSettlementConversions,
  listSettlementConversionsPaginated,
} from "@/lib/settlements/service";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";

const listSettlementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  conversionType: z.enum(["path", "direct"]).optional(),
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
  const parsedQuery = listSettlementsQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sortOrder: searchParams.get("sortOrder") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    conversionType: searchParams.get("conversionType") ?? undefined,
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
    parsedQuery.data.conversionType !== undefined ||
    parsedQuery.data.sortOrder !== undefined;

  if (hasListParams) {
    const result = await listSettlementConversionsPaginated(
      organization.id,
      organization.environment,
      parsedQuery.data,
    );

    return NextResponse.json(result);
  }

  const settlements = await listSettlementConversions(
    organization.id,
    organization.environment,
  );

  return NextResponse.json({ settlements });
}
