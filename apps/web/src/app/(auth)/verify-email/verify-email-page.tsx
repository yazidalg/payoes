"use client";

import { apiFetch } from "@/lib/api-client";
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
} from "@/constants/auth";
import {
  authFieldLabelClass,
  authFormFieldsClass,
  authFormSectionClass,
  authPageBodyClass,
  authPageContainerClass,
  authPageFooterClass,
  authPageLinkClass,
  authPageTitleClass,
} from "@/ui/auth/auth-styles";
import { AuthLayout } from "@/ui/layout/auth-layout";
import { Button, Input } from "@dub/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const isPending = searchParams.get("pending") === "1";
  const linkError = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl");
  const isInviteFlow = callbackUrl?.startsWith("/invite/") ?? false;

  const [email, setEmail] = useState(initialEmail);
  const [isResending, setIsResending] = useState(false);

  async function handleResend() {
    if (!email.trim()) {
      toast.error("Enter your email before requesting a new verification link.");
      return;
    }

    setIsResending(true);

    const response = await apiFetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        ...(callbackUrl ? { callbackUrl } : {}),
      }),
    });

    const data = (await response.json()) as {
      error?: string;
      code?: string;
      sent?: boolean;
      alreadyVerified?: boolean;
    };

    setIsResending(false);

    if (!response.ok) {
      if (data.code === AUTH_ERROR_CODES.RESEND_COOLDOWN) {
        toast.error(AUTH_ERROR_MESSAGES.RESEND_COOLDOWN);
        return;
      }

      toast.error(data.error ?? "Unable to resend verification email.");
      return;
    }

    if (data.alreadyVerified) {
      toast.success("This email is already verified. You can sign in now.");
      return;
    }

    toast.success("Verification email sent");
  }

  const linkErrorMessage =
    linkError === "expired"
      ? AUTH_ERROR_MESSAGES.TOKEN_EXPIRED
      : linkError === "invalid"
        ? AUTH_ERROR_MESSAGES.INVALID_TOKEN
        : null;

  return (
    <AuthLayout>
      <div className={authPageContainerClass}>
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className={authPageTitleClass}>Check your email</h3>
          <p className={authPageBodyClass}>
            {isPending
              ? isInviteFlow
                ? "We sent a verification link to your email. Open it to verify your account and continue to your invitation."
                : "We sent a verification link to your email. Open it to verify your account and continue onboarding."
              : "Open the verification link we sent to your email to continue."}
          </p>
        </div>

        <div className={authFormSectionClass}>
          <div className={authFormFieldsClass}>
            {linkErrorMessage ? (
              <p className="text-center text-sm font-medium text-neutral-500">
                {linkErrorMessage}
              </p>
            ) : null}

            <label>
              <span className={authFieldLabelClass}>Email</span>
              <Input
                id="verify-email"
                type="email"
                placeholder="panic@thedis.co"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <Button
              type="button"
              variant="secondary"
              text="Resend verification email"
              onClick={() => void handleResend()}
              loading={isResending}
              disabled={isResending}
            />
          </div>
        </div>

        <p className={authPageFooterClass}>
          <Link href="/login" className={authPageLinkClass}>
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
