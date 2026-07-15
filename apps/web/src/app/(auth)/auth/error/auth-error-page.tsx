"use client";

import { Button } from "@dub/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AUTH_CONFIGURATION_ADMIN_HINT,
  AUTH_JS_ERROR_MESSAGES,
} from "@/constants/auth";
import {
  authPageBodyClass,
  authPageContainerClass,
  authPageTitleClass,
} from "@/ui/auth/auth-styles";
import { AuthLayout } from "@/ui/layout/auth-layout";

const ERROR_HEADINGS: Record<string, string> = {
  Configuration: "Sign-in unavailable",
  AccessDenied: "Sign-in cancelled",
  Verification: "Sign-in link expired",
  OAuthCallback: "Sign-in cancelled",
  OAuthCallbackError: "Sign-in cancelled",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Configuration";
  const heading = ERROR_HEADINGS[error] ?? "Could not sign you in";
  const message =
    AUTH_JS_ERROR_MESSAGES[error] ??
    "Something went wrong during sign-in. Please try again.";

  return (
    <AuthLayout>
      <div className={authPageContainerClass}>
        <h3 className={authPageTitleClass}>{heading}</h3>
        <p className={`${authPageBodyClass} mt-4 text-center`}>{message}</p>
        {error === "Configuration" ? (
          <p className="mt-3 text-center text-xs text-neutral-400">
            {AUTH_CONFIGURATION_ADMIN_HINT}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/login">
            <Button text="Back to login" className="w-full" />
          </Link>
          <Link
            href="/"
            className="text-center text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
