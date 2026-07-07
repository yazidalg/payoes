import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationVerificationApplications } from "@/lib/db/schema";
import {
  parsePersonaWebhook,
  verifyPersonaWebhookSignature,
  type PersonaWebhookPayload,
} from "@/lib/kyc/persona";
import { applyPersonaInquiryStatus } from "@/lib/kyc/service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("persona-signature");

  if (
    !verifyPersonaWebhookSignature({
      rawBody,
      signatureHeader,
    })
  ) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: PersonaWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as PersonaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const event = parsePersonaWebhook(payload);

  if (!event?.referenceId || !event.inquiryId) {
    return NextResponse.json({ received: true });
  }

  const application = await db.query.organizationVerificationApplications.findFirst({
    where: eq(organizationVerificationApplications.organizationId, event.referenceId),
  });

  if (!application) {
    return NextResponse.json({ received: true });
  }

  await applyPersonaInquiryStatus({
    organizationId: event.referenceId,
    inquiryId: event.inquiryId,
    status: event.status,
  });

  return NextResponse.json({ received: true });
}
