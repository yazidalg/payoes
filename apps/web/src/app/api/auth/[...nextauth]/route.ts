import { handlers } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";

const { GET: authGET, POST: authPOST } = handlers;

function redirectToAuthError(request: NextRequest, error = "Configuration") {
  return NextResponse.redirect(
    new URL(`/auth/error?error=${encodeURIComponent(error)}`, request.url),
  );
}

async function handleAuthRequest(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<Response>,
) {
  try {
    const response = await handler(request);

    if (request.nextUrl.pathname.endsWith("/api/auth/error") && response.status >= 500) {
      const error = request.nextUrl.searchParams.get("error") ?? "Configuration";
      return redirectToAuthError(request, error);
    }

    return response;
  } catch {
    return redirectToAuthError(request);
  }
}

export function GET(request: NextRequest) {
  return handleAuthRequest(request, authGET);
}

export function POST(request: NextRequest) {
  return handleAuthRequest(request, authPOST);
}
