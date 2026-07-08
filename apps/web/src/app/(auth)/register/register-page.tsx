"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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

const registerSchema = z
  .object({
    name: z.string().min(1, { message: "Name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .max(255)
      .email({ message: "Email must be a valid email" }),
    password: z
      .string()
      .min(1, { message: "Password is required" })
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z
      .string()
      .min(1, { message: "Password is required" })
      .min(8, { message: "Password must be at least 8 characters" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Register = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/onboarding";
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<Register>({
    defaultValues: {
      name: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: Register) => {
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${values.name} ${values.lastName}`.trim(),
        email: values.email,
        password: values.password,
      }),
    });

    const data = (await response.json()) as {
      error?: string;
      code?: string;
      requiresVerification?: boolean;
    };

    if (!response.ok) {
      if (data.code === AUTH_ERROR_CODES.EMAIL_EXISTS) {
        setError(AUTH_ERROR_MESSAGES.EMAIL_EXISTS);
        return;
      }

      if (data.code === AUTH_ERROR_CODES.GOOGLE_ACCOUNT) {
        setError(AUTH_ERROR_MESSAGES.GOOGLE_ACCOUNT);
        return;
      }

      setError(data.error ?? "Unable to create account. Please try again.");
      return;
    }

    toast.success("Check your email to verify your account");
    router.push(
      `/verify-email?email=${encodeURIComponent(values.email)}&pending=1&callbackUrl=${encodeURIComponent(callbackUrl)}`
    );
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
        Create your Payoes account
      </CardTitle>
      <CardDescription>
        Start accepting and managing Stellar payments
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
                Or register with email
              </span>
            </div>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-4"
            >
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" autoComplete="given-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" autoComplete="family-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@company.com"
                          autoComplete="email"
                          {...field}
                        />
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
                          placeholder="Password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Password"
                          autoComplete="new-password"
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
                  Create account
                </Button>
              </div>
            </form>
          </Form>
          <div className="flex flex-row flex-wrap justify-between">
            <div className="mt-4 flex gap-2 text-center text-sm text-muted-foreground">
              Already have an account?
              <Link
                className="underline"
                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              >
                Sign in
              </Link>
            </div>
            <div className="mt-4 flex flex-row justify-center gap-2 text-center text-sm text-muted-foreground">
              Need help?
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
