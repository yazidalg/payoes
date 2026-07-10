"use client";

import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
} from "@/constants/auth";
import {
  authFieldLabelClass,
  authFormFieldsClass,
} from "@/ui/auth/auth-styles";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { errorCodes, LoginFormContext } from "./login-form";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email");

export const EmailSignIn = ({ next }: { next?: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const finalNext = next ?? searchParams?.get("callbackUrl") ?? "/onboarding";
  const { isMobile } = useMediaQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    setClickedMethod,
    authMethod,
    clickedMethod,
    showPasswordField,
    setShowPasswordField,
    setLastUsedAuthMethod,
    setShowSSOOption,
    setAuthMethod,
  } = useContext(LoginFormContext);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();

        if (!showPasswordField) {
          const parsedEmail = emailSchema.safeParse(email);
          if (!parsedEmail.success) {
            toast.error(
              parsedEmail.error.issues[0]?.message ?? "Invalid email",
            );
            return;
          }

          setShowPasswordField(true);
          return;
        }

        setClickedMethod("email");
        setIsSubmitting(true);

        const validation = await fetch("/api/auth/validate-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, callbackUrl: finalNext }),
        });

        const validationData = (await validation.json()) as {
          error?: string;
          code?: string;
          ok?: boolean;
          redirectTo?: string;
        };

        if (!validation.ok) {
          if (validationData.code === AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED) {
            router.push(
              `/verify-email?email=${encodeURIComponent(email)}&pending=1&callbackUrl=${encodeURIComponent(finalNext)}`,
            );
            setIsSubmitting(false);
            setClickedMethod(undefined);
            return;
          }

          toast.error(
            validationData.error ?? AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
          );
          setIsSubmitting(false);
          setClickedMethod(undefined);
          return;
        }

        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          toast.error(
            errorCodes[result.error as keyof typeof errorCodes] ??
              AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
          );
          setIsSubmitting(false);
          setClickedMethod(undefined);
          return;
        }

        setLastUsedAuthMethod("email");
        toast.success("Welcome to Payoes");
        router.push(validationData.redirectTo ?? finalNext);
        router.refresh();
      }}
      className={authFormFieldsClass}
    >
      {authMethod === "email" ? (
        <>
          <label>
            <span className={authFieldLabelClass}>Work email</span>
            <Input
              id="email"
              name="email"
              autoFocus={!isMobile && !showPasswordField}
              type="email"
              placeholder="panic@thedis.co"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {showPasswordField ? (
            <label>
              <span className={authFieldLabelClass}>Password</span>
              <Input
                type="password"
                value={password}
                placeholder="Password"
                autoComplete="current-password"
                required
                autoFocus={!isMobile}
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          ) : null}
        </>
      ) : null}

      <Button
        type={authMethod === "email" ? "submit" : "button"}
        text={`Log in with ${showPasswordField ? "password" : "email"}`}
        {...(authMethod !== "email" && {
          onClick: (e) => {
            e.preventDefault();
            setShowSSOOption(false);
            setAuthMethod("email");
          },
        })}
        loading={clickedMethod === "email" || isSubmitting}
        disabled={Boolean(clickedMethod && clickedMethod !== "email")}
      />
    </form>
  );
};
