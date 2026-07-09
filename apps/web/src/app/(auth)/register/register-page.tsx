"use client";

import { RegisterProvider } from "@/ui/auth/register/context";
import { SignUpForm } from "@/ui/auth/register/signup-form";
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

export default function RegisterPageClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/onboarding";

  return (
    <RegisterProvider>
      <AuthLayout showTerms>
        <div className={authPageContainerClass}>
          <h3 className={authPageTitleClass}>Create your Payoes account</h3>
          <div className={authFormSectionClass}>
            <SignUpForm methods={["email", "google"]} />
          </div>
          <p className={authPageFooterClass}>
            Already have an account?&nbsp;
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className={authPageLinkClass}
            >
              Log in
            </Link>
          </p>
        </div>
      </AuthLayout>
    </RegisterProvider>
  );
}
