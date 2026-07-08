import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import { sendTestWebhook } from "@/lib/webhooks/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; webhookId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, webhookId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const delivery = await sendTestWebhook(
      organization.id,
      webhookId,
      organization.environment
    );

    return NextResponse.json({ delivery });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to send test webhook",
      },
      { status: 400 }
    );
  }
}
