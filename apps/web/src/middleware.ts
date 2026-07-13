import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSafePostAuthRedirect } from "@/lib/auth/safe-redirect";
import {
  GO_SESSION_COOKIE,
  verifyGoSessionToken,
} from "@/lib/auth/go-session";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(GO_SESSION_COOKIE)?.value;
  const sessionUser = await verifyGoSessionToken(token);
  const isLoggedIn = Boolean(sessionUser);

  if (pathname === "/api/auth/error") {
    const errorUrl = new URL("/auth/error", req.nextUrl.origin);
    errorUrl.search = req.nextUrl.search;
    return NextResponse.redirect(errorUrl);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const callbackUrl = getSafePostAuthRedirect(
    req.nextUrl.searchParams.get("callbackUrl"),
  );

  if (
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/business") ||
      pathname.startsWith("/organizations")) &&
    !isLoggedIn
  ) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/register") && isLoggedIn) {
    if (callbackUrl) {
      return NextResponse.redirect(new URL(callbackUrl, req.nextUrl.origin));
    }

    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (pathname === "/verify-email" && isLoggedIn) {
    if (callbackUrl) {
      return NextResponse.redirect(new URL(callbackUrl, req.nextUrl.origin));
    }

    return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/api/auth/error",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/onboarding",
    "/business/:path*",
    "/business",
    "/organizations/:path*",
    "/organizations",
    "/login",
    "/register",
    "/verify-email",
    "/invite/:path*",
    "/c/:path*",
  ],
};
