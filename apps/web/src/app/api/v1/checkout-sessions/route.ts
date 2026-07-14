import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import {
  listCheckoutSessions,
  serializeCheckoutSession,
} from "@/lib/checkout-sessions/service";

export async function GET(request: Request) {
  return withApiKeyAuth(
    request,
    async ({ apiKey }) => {
      const sessions = await listCheckoutSessions(
        apiKey.organizationId,
        apiKey.environment
      );

      return NextResponse.json({
        checkout_sessions: sessions.map((row) => serializeCheckoutSession(row)),
      });
    },
    { resource: "checkout_sessions", action: "read" }
  );
}
