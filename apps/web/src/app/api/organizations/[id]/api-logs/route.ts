import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { listApiLogsPaginated } from "@/lib/api-logs/service";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";

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
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  const search = searchParams.get("search") ?? undefined;
  const method = searchParams.get("method") ?? undefined;
  const statusGroup = searchParams.get("statusGroup") as
    | "2xx"
    | "4xx"
    | "5xx"
    | undefined;
  const apiKeyId = searchParams.get("apiKeyId") ?? undefined;

  const { logs, total } = await listApiLogsPaginated(
    organization.id,
    organization.environment,
    {
      page,
      pageSize,
      search,
      method,
      statusGroup,
      apiKeyId,
    },
  );

  return NextResponse.json({ logs, total });
}
