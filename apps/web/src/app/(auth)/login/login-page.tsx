"use client";

import LoginForm from "@/ui/auth/login/login-form";
import {
  authFormSectionClass,
  authPageContainerClass,
  authPageFooterClass,
  authPageLinkClass,
  authPageTitleClass,
} from "@/ui/auth/auth-styles";
import { AuthLayout } from "@/ui/layout/auth-layout";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/onboarding";

  return (
    <AuthLayout showTerms>
      <div className={authPageContainerClass}>
        <h3 className={authPageTitleClass}>Log in to your Payoes account</h3>
        <div className={authFormSectionClass}>
          <LoginForm next={callbackUrl} methods={["google", "email"]} />
        </div>
        <p className={authPageFooterClass}>
          Don&apos;t have an account?&nbsp;
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className={authPageLinkClass}
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
