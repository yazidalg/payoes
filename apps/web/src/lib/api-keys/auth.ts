import { NextResponse } from "next/server";
import {
  apiKeyHasScope,
  type ApiKeyResourceKey,
} from "@/lib/api-keys/scopes";
import { authenticateApiKey } from "@/lib/api-keys/service";
import { logApiRequest } from "@/lib/api-logs/service";

export async function getApiKeyFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authorization.slice("Bearer ".length).trim();
  return authenticateApiKey(rawKey);
}

export type ApiKeyAuthOptions = {
  resource: ApiKeyResourceKey;
  action: "read" | "write";
};

export async function withApiKeyAuth(
  request: Request,
  handler: (context: {
    apiKey: NonNullable<Awaited<ReturnType<typeof authenticateApiKey>>>;
  }) => Promise<Response>,
  options?: ApiKeyAuthOptions
) {
  const startedAt = Date.now();
  const apiKey = await getApiKeyFromRequest(request);

  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    options &&
    !apiKeyHasScope(apiKey.scopes ?? ["apis.all"], options.resource, options.action)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const response = await handler({ apiKey });

  await logApiRequest({
    organizationId: apiKey.organizationId,
    environment: apiKey.environment,
    apiKeyId: apiKey.id,
    method: request.method,
    path: new URL(request.url).pathname,
    statusCode: response.status,
    durationMs: Date.now() - startedAt,
  });

  return response;
}
