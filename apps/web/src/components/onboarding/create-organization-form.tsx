"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { OrganizationLogoUpload } from "@/components/onboarding/organization-logo-upload";
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

const organizationSchema = z.object({
  name: z.string().min(1, "Business name is required").max(120),
  email: z.string().email("Business email must be a valid email"),
  website: z
    .string()
    .max(200)
    .refine(
      (value) => !value || /^https?:\/\/.+/i.test(value),
      "Website must be a valid URL"
    )
    .optional()
    .or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

type OrganizationForm = z.infer<typeof organizationSchema>;

export function CreateOrganizationForm({
  defaultEmail,
}: {
  defaultEmail?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const form = useForm<OrganizationForm>({
    defaultValues: {
      name: "",
      email: defaultEmail ?? "",
      website: "",
      description: "",
    },
    resolver: zodResolver(organizationSchema),
  });

  const businessName = form.watch("name");

  const onSubmit = async (values: OrganizationForm) => {
    setError(null);

    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("email", values.email);
    formData.append("website", values.website ?? "");
    formData.append("description", values.description ?? "");

    if (logoFile) {
      formData.append("logo", logoFile);
    }

    const response = await fetch("/api/organizations", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to create organization. Please try again.");
      return;
    }

    toast.success("Workspace created successfully");
    router.push("/onboarding/wallet");
    router.refresh();
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <CardTitle className="text-2xl font-bold">Create your organization</CardTitle>
      <CardDescription className="text-center">
        Set up the business profile that appears on checkout pages, payment
        links, and customer-facing experiences.
      </CardDescription>

      <div className="w-full">
        <CardContent className="space-y-4 p-0">
          {error ? (
            <AlertBlock type="error" className="my-2">
              {error}
            </AlertBlock>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <OrganizationLogoUpload
                businessName={businessName}
                value={logoFile}
                onChange={setLogoFile}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Payments" {...field} />
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
                    <FormLabel>Business Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="billing@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Description</FormLabel>
                    <FormControl>
                      <textarea
                        rows={4}
                        placeholder="What does your business do?"
                        className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={form.formState.isSubmitting}
              >
                Create organization
              </Button>
            </form>
          </Form>
        </CardContent>
      </div>
    </div>
  );
}
