"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
  const [error, setError] = useState<string | null>(null);

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

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      if (data.error === "EMAIL_EXISTS") {
        setError("An account with this email already exists.");
        return;
      }

      setError(data.error ?? "Unable to create account. Please try again.");
      return;
    }

    toast.success("Account created successfully");
    router.push("/login?registered=1");
  };

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
        <CardContent className="p-0">
          {error && (
            <AlertBlock type="error" className="my-2">
              {error}
            </AlertBlock>
          )}
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
                  className="w-full"
                >
                  Register
                </Button>
              </div>
            </form>
          </Form>
          <div className="flex flex-row flex-wrap justify-between">
            <div className="mt-4 flex gap-2 text-center text-sm text-muted-foreground">
              Already have an account?
              <Link className="underline" href="/login">
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
