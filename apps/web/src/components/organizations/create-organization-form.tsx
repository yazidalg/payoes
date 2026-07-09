"use client";

import type { Organization } from "@/lib/db/schema";
import { Button, FileUpload, buttonVariants, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type FormData = {
  name: string;
  email: string;
  website: string;
  description: string;
};

const inputClassName =
  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm";

export function CreateOrganizationForm({
  defaultEmail,
  onSuccess,
  className,
  redirectTo,
}: {
  defaultEmail?: string | null;
  onSuccess?: (organization: Organization) => void;
  className?: string;
  redirectTo?: string;
}) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { isSubmitting, isSubmitSuccessful, errors },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      email: defaultEmail ?? "",
      website: "",
      description: "",
    },
  });

  const { isMobile } = useMediaQuery();

  useEffect(() => {
    if (defaultEmail) {
      setValue("email", defaultEmail);
    }
  }, [defaultEmail, setValue]);

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          const formData = new FormData();
          formData.append("name", data.name);
          formData.append("email", data.email);
          formData.append("website", data.website);
          formData.append("description", data.description);

          if (logoFile) {
            formData.append("logo", logoFile);
          }

          const response = await fetch("/api/organizations", {
            method: "POST",
            body: formData,
          });

          const payload = (await response.json()) as {
            error?: string;
            organization?: Organization;
          };

          if (!response.ok || !payload.organization) {
            const message =
              payload.error ?? "Unable to create organization. Please try again.";

            if (message.toLowerCase().includes("email")) {
              setError("email", { message });
              return;
            }

            if (message.toLowerCase().includes("name")) {
              setError("name", { message });
              return;
            }

            toast.error(message);
            setError("root.serverError", { message });
            return;
          }

          if (onSuccess) {
            onSuccess(payload.organization);
            return;
          }

          toast.success("Organization created successfully");
          window.location.assign(redirectTo ?? "/dashboard/payments");
        } catch {
          toast.error("Failed to create organization.");
          setError("root.serverError", {
            message: "Failed to create organization",
          });
        }
      })}
      className={cn("flex flex-col space-y-6 text-left", className)}
    >
      <div>
        <label htmlFor="name" className="flex items-center space-x-2">
          <p className="block text-sm font-medium text-neutral-700">
            Organization name
          </p>
        </label>
        <div className="mt-2 flex rounded-md shadow-sm">
          <input
            id="name"
            type="text"
            autoFocus={!isMobile}
            autoComplete="organization"
            className={cn(
              inputClassName,
              errors.name &&
                "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
            )}
            placeholder="Acme Payments"
            {...register("name", {
              required: "Organization name is required",
              maxLength: 120,
            })}
          />
        </div>
        {errors.name ? (
          <p className="mt-1.5 text-xs font-medium text-red-600">
            {errors.name.message}
          </p>
        ) : (
          <p className="text-content-subtle mt-1.5 text-xs">
            This is the name of your company or product.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="flex items-center space-x-2">
          <p className="block text-sm font-medium text-neutral-700">
            Business email
          </p>
        </label>
        <div className="mt-2 flex rounded-md shadow-sm">
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={cn(
              inputClassName,
              errors.email &&
                "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
            )}
            placeholder="billing@company.com"
            {...register("email", {
              required: "Business email is required",
            })}
          />
        </div>
        {errors.email ? (
          <p className="mt-1.5 text-xs font-medium text-red-600">
            {errors.email.message}
          </p>
        ) : (
          <p className="text-content-subtle mt-1.5 text-xs">
            Used on invoices, payment links, and customer-facing pages.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="website" className="flex items-center space-x-2">
          <p className="block text-sm font-medium text-neutral-700">
            Business website
          </p>
        </label>
        <div className="mt-2 flex rounded-md shadow-sm">
          <input
            id="website"
            type="url"
            autoComplete="url"
            className={cn(
              inputClassName,
              errors.website &&
                "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
            )}
            placeholder="https://company.com"
            {...register("website", {
              validate: (value) => {
                if (!value) {
                  return true;
                }

                return (
                  /^https?:\/\/.+/i.test(value) ||
                  "Website must be a valid URL"
                );
              },
            })}
          />
        </div>
        {errors.website ? (
          <p className="mt-1.5 text-xs font-medium text-red-600">
            {errors.website.message}
          </p>
        ) : (
          <p className="text-content-subtle mt-1.5 text-xs">
            Optional. Shown on hosted checkout and payment pages.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description">
          <p className="block text-sm font-medium text-neutral-700">
            Business description
          </p>
        </label>
        <div className="mt-2 flex rounded-md shadow-sm">
          <textarea
            id="description"
            rows={4}
            className={cn(inputClassName, "min-h-24 resize-none")}
            placeholder="What does your business do?"
            {...register("description", { maxLength: 500 })}
          />
        </div>
        <p className="text-content-subtle mt-1.5 text-xs">
          Optional. Helps customers understand your business on hosted pages.
        </p>
      </div>

      <div>
        <label>
          <p className="block text-sm font-medium text-neutral-700">
            Organization logo
          </p>
          <div className="mt-1.5 flex items-center gap-5">
            <FileUpload
              accept="images"
              className="size-20 rounded-full border border-neutral-300"
              iconClassName="size-5"
              previewClassName="size-12 rounded-full"
              variant="plain"
              imageSrc={logoPreview}
              readFile
              onChange={({ file, src }) => {
                setLogoFile(file);
                setLogoPreview(src);
              }}
              content={null}
              maxFileSizeMB={2}
              targetResolution={{ width: 160, height: 160 }}
            />
            <div>
              <div
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "flex h-7 w-fit cursor-pointer items-center rounded-md border px-2 text-xs",
                )}
              >
                Upload image
              </div>
              <p className="mt-1.5 text-xs text-neutral-500">
                Recommended size: 160x160px
              </p>
            </div>
          </div>
        </label>
      </div>

      {errors.root?.serverError ? (
        <p className="text-xs font-medium text-red-600">
          {errors.root.serverError.message}
        </p>
      ) : null}

      <Button
        loading={isSubmitting || isSubmitSuccessful}
        text="Create organization"
      />
    </form>
  );
}
