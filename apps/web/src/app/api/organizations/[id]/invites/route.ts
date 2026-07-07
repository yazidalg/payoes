import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertCanManageTeam,
  createOrganizationInvite,
  getMembershipForUser,
  listPendingInvites,
} from "@/lib/organizations/members";
import { membersErrorResponse } from "@/lib/organizations/members-api";

const inviteSchema = z.object({
  email: z.string().email("Email must be valid"),
  role: z.enum(["admin", "member"]),
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
  const membership = await getMembershipForUser(id, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    assertCanManageTeam(membership.role);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await listPendingInvites(id);

  return NextResponse.json({ invites });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const membership = await getMembershipForUser(id, session.user.id);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    assertCanManageTeam(membership.role);

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const invite = await createOrganizationInvite({
      organizationId: id,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedByUserId: session.user.id,
    });

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    return membersErrorResponse(error);
  }
}
