import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  getMembershipForUser,
  listOrganizationMembers,
} from "@/lib/organizations/members";
import { membersErrorResponse } from "@/lib/organizations/members-api";

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

  const members = await listOrganizationMembers(id);

  return NextResponse.json({
    members,
    viewer: {
      userId: session.user.id,
      role: membership.role,
    },
  });
}
