import { NextResponse } from "next/server";
import { getInvitePreview } from "@/lib/organizations/members";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await getInvitePreview(token);

  if (!invite) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  return NextResponse.json({ invite });
}
