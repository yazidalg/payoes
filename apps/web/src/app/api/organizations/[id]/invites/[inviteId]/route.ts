import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  assertCanManageTeam,
  getMembershipForUser,
  resendOrganizationInvite,
  revokeOrganizationInvite,
} from "@/lib/organizations/members";
import { membersErrorResponse } from "@/lib/organizations/members-api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, inviteId } = await params;
    const membership = await getMembershipForUser(id, session.user.id);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    assertCanManageTeam(membership.role);

    const invite = await resendOrganizationInvite({
      organizationId: id,
      inviteId,
    });

    return NextResponse.json({ invite });
  } catch (error) {
    return membersErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, inviteId } = await params;
    const membership = await getMembershipForUser(id, session.user.id);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    assertCanManageTeam(membership.role);

    const invite = await revokeOrganizationInvite({
      organizationId: id,
      inviteId,
    });

    return NextResponse.json({ invite });
  } catch (error) {
    return membersErrorResponse(error);
  }
}
