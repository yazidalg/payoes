import { auth } from "@/auth";
import { getOrganizationAnalytics } from "@/lib/analytics/service";
import { analyticsQuerySchema } from "@/lib/analytics/schemas";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";
import { NextResponse } from "next/server";

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
  const parsed = analyticsQuerySchema.safeParse({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const analytics = await getOrganizationAnalytics(
    organization.id,
    organization.environment,
    new Date(parsed.data.from),
    new Date(parsed.data.to),
  );

  return NextResponse.json(analytics);
}
