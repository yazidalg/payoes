import { NextResponse } from "next/server";
import { processDueWebhookRetries } from "@/lib/webhooks/delivery";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : request.headers.get("x-cron-secret");

  if (token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processDueWebhookRetries();

  return NextResponse.json({ processed });
}
