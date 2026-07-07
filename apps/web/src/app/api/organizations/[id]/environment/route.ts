import { auth } from "@/auth";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";

const environmentSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (parsed.data.environment === "production") {
    return NextResponse.json(
      { error: "Production mode is not available yet" },
      { status: 403 }
    );
  }

  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, session.user.id),
      eq(organizationMembers.organizationId, id)
    ),
    columns: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
}
