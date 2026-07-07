"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { OrganizationLogoUpload } from "@/components/onboarding/organization-logo-upload";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { MemberRole, Organization } from "@/lib/db/schema";

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

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function OrganizationSettingsPanel({
  organization,
  viewerRole,
}: {
  organization: Organization;
  viewerRole: MemberRole;
}) {
  const router = useRouter();
  const canEdit = viewerRole === "owner" || viewerRole === "admin";
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const form = useForm<OrganizationForm>({
    defaultValues: {
      name: organization.name,
      email: organization.email,
      website: organization.website ?? "",
      description: organization.description ?? "",
    },
    resolver: zodResolver(organizationSchema),
  });

  const businessName = useWatch({ control: form.control, name: "name" });

  const onSubmit = async (values: OrganizationForm) => {
    if (!canEdit) {
      return;
    }

    setError(null);

    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("email", values.email);
    formData.append("website", values.website ?? "");
    formData.append("description", values.description ?? "");

    if (logoFile) {
      formData.append("logo", logoFile);
    }

    const response = await fetch(`/api/organizations/${organization.id}`, {
      method: "PATCH",
      body: formData,
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to update organization. Please try again.");
      return;
    }

    toast.success("Organization updated");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your business profile shown on checkout pages and payment links.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
          <CardDescription>
            {canEdit
              ? "Update the details customers see when they pay you."
              : "You can view organization details but cannot edit them."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <AlertBlock type="error" className="my-2">
              {error}
            </AlertBlock>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {canEdit ? (
                <OrganizationLogoUpload
                  businessName={businessName}
                  value={logoFile}
                  onChange={setLogoFile}
                  existingLogoUrl={organization.logoUrl}
                />
              ) : null}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Payments" disabled={!canEdit} {...field} />
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
                    <FormLabel>Business email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="billing@company.com"
                        disabled={!canEdit}
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
                    <FormLabel>Business website</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://company.com"
                        disabled={!canEdit}
                        {...field}
                      />
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
                    <FormLabel>Business description</FormLabel>
                    <FormControl>
                      <textarea
                        rows={4}
                        placeholder="What does your business do?"
                        disabled={!canEdit}
                        className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {canEdit ? (
                <Button type="submit" isLoading={form.formState.isSubmitting}>
                  Save changes
                </Button>
              ) : null}
            </form>
          </Form>

          <div className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Organization ID</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{organization.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Public slug</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{organization.slug}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Environment</p>
              <p className="mt-1 text-sm capitalize text-muted-foreground">
                {organization.environment}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(organization.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
