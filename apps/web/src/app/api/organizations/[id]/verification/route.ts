import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { kycErrorResponse } from "@/lib/kyc/api";
import { getVerificationSummary, startVerification } from "@/lib/kyc/service";
import { getMembershipForUser } from "@/lib/organizations/members";

const verificationSchema = z.object({
  account_type: z.enum(["personal", "business"]).optional(),
});

export async function GET(
  _request: Request,
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

    const summary = await getVerificationSummary(id);
    return NextResponse.json(summary);
  } catch (error) {
    return kycErrorResponse(error);
  }
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
    const body = await request.json().catch(() => ({}));
    const parsed = verificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid verification request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const application = await startVerification({
      organizationId: id,
      userId: session.user.id,
      accountType: parsed.data.account_type,
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return kycErrorResponse(error);
  }
}
