import { NextResponse } from "next/server";
import { signIn } from "@/auth";
import {
  consumeEmailVerificationToken,
  createPostVerifyLoginToken,
} from "@/lib/auth/verification-token";
import { markEmailVerified } from "@/lib/auth/users";

function redirectWithError(request: Request, error: string) {
  const url = new URL("/verify-email", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return redirectWithError(request, "invalid");
  }

  try {
    const user = await consumeEmailVerificationToken(token);

    if (!user) {
      return redirectWithError(request, "invalid");
    }

    if (!user.emailVerifiedAt) {
      await markEmailVerified(user.id);
    }

    const loginToken = await createPostVerifyLoginToken(user.id);

    return signIn("credentials", {
      loginToken,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "TOKEN_EXPIRED") {
        return redirectWithError(request, "expired");
      }

      if (error.message === "INVALID_TOKEN") {
        return redirectWithError(request, "invalid");
      }
    }

    console.error("Email verification failed:", error);
    return redirectWithError(request, "invalid");
  }
}
