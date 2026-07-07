import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { kycErrorResponse } from "@/lib/kyc/api";
import { getVerificationSession, syncVerificationFromPersona } from "@/lib/kyc/service";
import { getMembershipForUser } from "@/lib/organizations/members";

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

    const body = (await request.json().catch(() => ({}))) as { action?: string };

    if (body.action === "sync") {
      const summary = await syncVerificationFromPersona(id);
      return NextResponse.json(summary);
    }

    const sessionData = await getVerificationSession(id, session.user.id);
    return NextResponse.json(sessionData);
  } catch (error) {
    return kycErrorResponse(error);
  }
}
