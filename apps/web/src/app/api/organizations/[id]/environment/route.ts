import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { kycErrorResponse } from "@/lib/kyc/api";
import { assertOrganizationProductionReady } from "@/lib/kyc/service";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMembershipForUser } from "@/lib/organizations/members";

const environmentSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = environmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const membership = await getMembershipForUser(id, session.user.id);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (parsed.data.environment === "production") {
      if (membership.role !== "owner" && membership.role !== "admin") {
        return NextResponse.json(
          { error: "Only owners and admins can enable production" },
          { status: 403 }
        );
      }

      await assertOrganizationProductionReady(id);
    }

    const [organization] = await db
      .update(organizations)
      .set({
        environment: parsed.data.environment,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();

    return NextResponse.json({ organization });
  } catch (error) {
    return kycErrorResponse(error);
  }
}
