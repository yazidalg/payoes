import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertCanManageTeam,
  getMembershipForUser,
  removeOrganizationMember,
  updateMemberRole,
} from "@/lib/organizations/members";
import { membersErrorResponse } from "@/lib/organizations/members-api";

const roleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;
    const membership = await getMembershipForUser(id, session.user.id);

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const member = await updateMemberRole({
      organizationId: id,
      targetUserId: userId,
      role: parsed.data.role,
    });

    return NextResponse.json({ member });
  } catch (error) {
    return membersErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;
    const membership = await getMembershipForUser(id, session.user.id);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    assertCanManageTeam(membership.role);

    await removeOrganizationMember({
      organizationId: id,
      targetUserId: userId,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ removed: true });
  } catch (error) {
    return membersErrorResponse(error);
  }
}
