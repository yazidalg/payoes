"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/shared/logo";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
} from "@/constants/auth";
import { MailIcon } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const isPending = searchParams.get("pending") === "1";
  const linkError = searchParams.get("error");

  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  async function handleResend() {
    if (!email.trim()) {
      setError("Enter your email before requesting a new verification link.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsResending(true);

    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
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
        setError(AUTH_ERROR_MESSAGES.RESEND_COOLDOWN);
        return;
      }

      setError(data.error ?? "Unable to resend verification email.");
      return;
    }

    if (data.alreadyVerified) {
      setMessage("This email is already verified. You can sign in now.");
      return;
    }

    toast.success("Verification email sent");
    setMessage("A new verification link has been sent to your email.");
  }

  const linkErrorMessage =
    linkError === "expired"
      ? AUTH_ERROR_MESSAGES.TOKEN_EXPIRED
      : linkError === "invalid"
        ? AUTH_ERROR_MESSAGES.INVALID_TOKEN
        : null;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MailIcon className="size-7" />
      </div>
      <CardTitle className="flex flex-row items-center gap-2 text-2xl font-bold">
        <Logo className="size-10" />
        Check your email
      </CardTitle>
      <CardDescription className="max-w-md text-center">
        {isPending
          ? "We sent a verification link to your email. Open it to verify your account and continue onboarding."
          : "Open the verification link we sent to your email to continue."}
      </CardDescription>

      <div className="w-full">
        <CardContent className="space-y-4 p-0">
          {linkErrorMessage ? (
            <AlertBlock type="error">{linkErrorMessage}</AlertBlock>
          ) : null}
          {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
          {message ? <AlertBlock type="success">{message}</AlertBlock> : null}

          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              After you verify, you will be signed in automatically and can
              continue creating your organization.
            </p>
            <p className="mt-3">
              If you close this page, sign in later and we will send you back to
              onboarding once your email is verified.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="verify-email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <Input
              id="verify-email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleResend()}
            isLoading={isResending}
          >
            Resend verification email
          </Button>

          <div className="flex flex-row flex-wrap justify-between gap-2 text-center text-sm text-muted-foreground">
            <Link className="underline" href="/login">
              Back to sign in
            </Link>
            <Link className="underline" href="/">
              Back to home
            </Link>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
