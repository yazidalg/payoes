import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { getSafePostAuthRedirect } from "@/lib/auth/safe-redirect";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const callbackUrl = getSafePostAuthRedirect(
    req.nextUrl.searchParams.get("callbackUrl"),
  );

  if (
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
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
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/onboarding",
    "/organizations/:path*",
    "/organizations",
    "/login",
    "/register",
    "/verify-email",
    "/invite/:path*",
    "/c/:path*",
  ],
};
