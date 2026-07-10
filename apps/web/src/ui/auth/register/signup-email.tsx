"use client";

import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
} from "@/constants/auth";
import { PasswordRequirements } from "@/ui/shared/password-requirements";
import {
  authFieldLabelClass,
  authFormFieldsClass,
} from "@/ui/auth/auth-styles";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email");

const signUpSchema = z
  .object({
    name: z.string().min(1, "Full name is required"),
    email: emailSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Password must contain at least one number, one uppercase, and one lowercase letter",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpProps = z.infer<typeof signUpSchema>;

export const SignUpEmail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/onboarding";
  const { isMobile } = useMediaQuery();
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<SignUpProps>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setError,
  } = form;

  const submitRegistration = useCallback(
    async (data: SignUpProps) => {
      const parsed = signUpSchema.safeParse(data);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        if (issue?.path[0]) {
          setError(issue.path[0] as keyof SignUpProps, {
            message: issue.message,
          });
        }
        toast.error(issue?.message ?? "Invalid form data");
        return;
      }

      setIsPending(true);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email,
          password: data.password,
          callbackUrl,
        }),
      });

      const responseData = (await response.json()) as {
        error?: string;
        code?: string;
        requiresVerification?: boolean;
      };

      setIsPending(false);

      if (!response.ok) {
        if (responseData.code === AUTH_ERROR_CODES.EMAIL_EXISTS) {
          toast.error(AUTH_ERROR_MESSAGES.EMAIL_EXISTS);
          return;
        }

        if (responseData.code === AUTH_ERROR_CODES.GOOGLE_ACCOUNT) {
          toast.error(AUTH_ERROR_MESSAGES.GOOGLE_ACCOUNT);
          return;
        }

        toast.error(
          responseData.error ?? "Unable to create account. Please try again.",
        );
        return;
      }

      toast.success("Check your email to verify your account");
      router.push(
        `/verify-email?email=${encodeURIComponent(data.email)}&pending=1&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
    },
    [callbackUrl, router, setError],
  );

  const onSubmit = useCallback(
    (e: FormEvent) => {
      const { email, password } = getValues();

      if (email && !password && !showPassword) {
        e.preventDefault();
        e.stopPropagation();

        const parsedEmail = emailSchema.safeParse(email);
        if (!parsedEmail.success) {
          setError("email", {
            message: parsedEmail.error.issues[0]?.message ?? "Invalid email",
          });
          toast.error(
            parsedEmail.error.issues[0]?.message ?? "Invalid email",
          );
          return;
        }

        setShowPassword(true);
        return;
      }

      handleSubmit(submitRegistration)(e);
    },
    [getValues, showPassword, handleSubmit, submitRegistration, setError],
  );

  return (
    <form onSubmit={onSubmit}>
      <div className={authFormFieldsClass}>
        <label>
          <span className={authFieldLabelClass}>Work email</span>
          <Input
            type="email"
            placeholder="panic@thedis.co"
            autoComplete="email"
            required
            autoFocus={!isMobile && !showPassword}
            {...register("email")}
            error={errors.email?.message}
          />
        </label>

        {showPassword ? (
          <div className={authFormFieldsClass}>
            <label>
              <span className={authFieldLabelClass}>Full name</span>
              <Input
                placeholder="John Doe"
                autoComplete="name"
                required
                autoFocus={!isMobile}
                {...register("name")}
                error={errors.name?.message}
              />
            </label>

            <label>
              <span className={authFieldLabelClass}>Password</span>
              <Input
                type="password"
                required
                autoComplete="new-password"
                {...register("password")}
                error={errors.password?.message}
                minLength={8}
              />
              <FormProvider {...form}>
                <PasswordRequirements />
              </FormProvider>
            </label>

            <label>
              <span className={authFieldLabelClass}>Confirm password</span>
              <Input
                type="password"
                required
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
                minLength={8}
              />
            </label>
          </div>
        ) : null}

        <Button
          type="submit"
          text={isPending ? "Submitting..." : "Sign Up"}
          disabled={isPending}
          loading={isPending}
        />
      </div>
    </form>
  );
};
