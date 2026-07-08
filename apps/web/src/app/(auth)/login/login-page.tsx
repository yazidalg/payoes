"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/shared/logo";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
} from "@/constants/auth";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .max(255, { message: "Email must be at most 255 characters" })
    .email({ message: "Email must be a valid email" }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
});

type Login = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/onboarding";
  const authError = searchParams.get("error");

  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<Login>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (authError === "credentials_account") {
      setError(AUTH_ERROR_MESSAGES.CREDENTIALS_ACCOUNT);
    }
  }, [authError]);

  const onSubmit = async (values: Login) => {
    setError(null);

    const validation = await fetch("/api/auth/validate-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const validationData = (await validation.json()) as {
      error?: string;
      code?: string;
      ok?: boolean;
      redirectTo?: string;
    };

    if (!validation.ok) {
      setError(
        validationData.error ?? AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS
      );

      if (validationData.code === AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED) {
        router.push(
          `/verify-email?email=${encodeURIComponent(values.email)}&pending=1`
        );
      }

      return;
    }

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setError(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
      return;
    }

    toast.success("Welcome to Payoes");
    router.push(validationData.redirectTo ?? "/onboarding");
    router.refresh();
  };

  async function handleGoogleSignIn() {
    setError(null);
    setIsGoogleLoading(true);
    await signIn("google", { callbackUrl: "/onboarding" });
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <CardTitle className="flex flex-row items-center gap-2 text-2xl font-bold">
        <Logo className="size-10" />
        Sign in to Payoes
      </CardTitle>
      <CardDescription>
        Access your dashboard, payments, and Stellar wallet
      </CardDescription>

      <div className="w-full">
        <CardContent className="space-y-4 p-0">
          {error ? (
            <AlertBlock type="error" className="my-2">
              {error}
            </AlertBlock>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            isLoading={isGoogleLoading}
            disabled={form.formState.isSubmitting}
            onClick={handleGoogleSignIn}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Your password"
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  isLoading={form.formState.isSubmitting}
                  disabled={isGoogleLoading}
                  className="w-full"
                >
                  Sign in
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-4 flex flex-row flex-wrap justify-between gap-2">
            <div className="flex gap-2 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?
              <Link
                className="underline"
                href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              >
                Create an account
              </Link>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <Link className="underline" href="/">
                Back to home
              </Link>
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
