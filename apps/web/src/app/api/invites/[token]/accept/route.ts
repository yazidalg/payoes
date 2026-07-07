import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { acceptOrganizationInvite } from "@/lib/organizations/members";
import { membersErrorResponse } from "@/lib/organizations/members-api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    const result = await acceptOrganizationInvite({
      token,
      userId: session.user.id,
      userEmail: session.user.email,
    });

    return NextResponse.json(result);
  } catch (error) {
    return membersErrorResponse(error);
  }
}
