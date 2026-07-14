import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getMembershipForUser } from "@/lib/organizations/members";
import { setActiveOrganizationCookie } from "@/lib/organizations/active-organization";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const membership = await getMembershipForUser(
    parsed.data.organizationId,
    session.user.id
  );

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this business" },
      { status: 403 }
    );
  }

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, parsed.data.organizationId))
    .limit(1);

  if (!organization) {
    return NextResponse.json(
      { error: "Business not found" },
      { status: 404 }
    );
  }

  await setActiveOrganizationCookie(organization.id);

  return NextResponse.json({ organization });
}
