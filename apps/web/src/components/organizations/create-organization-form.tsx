"use client";

import type { Organization } from "@/lib/db/schema";
import {
  createOrganizationInlineValidators,
  createOrganizationRequiredValidators,
  type CreateOrganizationFormValues,
} from "@/lib/validation/create-organization-validation";
import {
  getVisibleInlineError,
  useSplitFormValidation,
  useTouchedFields,
} from "@/lib/validation/form-validation";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { FormInput } from "@/ui/forms/form-input";
import { FormTextarea } from "@/ui/forms/form-textarea";
import { ValidatedSubmitButton } from "@/ui/forms/validated-submit-button";
import { FileUpload, Avatar, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CreateOrganizationField = keyof CreateOrganizationFormValues;

export function CreateOrganizationForm({
  defaultEmail,
  onSuccess,
  className,
  redirectTo,
  submitLabel = "Create organization",
  onStepComplete,
}: {
  defaultEmail?: string | null;
  onSuccess?: (organization: Organization) => void;
  className?: string;
  redirectTo?: string;
  submitLabel?: string;
  onStepComplete?: (formData: FormData) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { touched, touch } = useTouchedFields<CreateOrganizationField>();

  useEffect(() => {
    if (defaultEmail) {
      setEmail(defaultEmail);
    }
  }, [defaultEmail]);

  const formValues = useMemo<CreateOrganizationFormValues>(
    () => ({
      name,
      email,
      website,
      description,
    }),
    [name, email, website, description],
  );

  const {
    firstRequiredError,
    inlineErrorsByField,
    hasInlineErrors,
    isValid,
  } = useSplitFormValidation(
    formValues,
    createOrganizationRequiredValidators,
    createOrganizationInlineValidators,
  );

  function handleFieldChange(
    field: CreateOrganizationField,
    value: string,
    setter: (value: string) => void,
  ) {
    touch(field);
    setter(value);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();

    if (!isValid) {
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    formData.append("website", website.trim());
    formData.append("description", description.trim());

    if (logoFile) {
      formData.append("logo", logoFile);
    }

    if (onStepComplete) {
      await onStepComplete(formData);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        organization?: Organization;
      };

      if (!response.ok || !payload.organization) {
        setError(
          payload.error ?? "Unable to create organization. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess(payload.organization);
        setIsLoading(false);
        return;
      }

      toast.success("Organization created successfully");
      window.location.assign(redirectTo ?? "/dashboard/payments");
    } catch {
      setError("Failed to create organization");
      setIsLoading(false);
    }
  }

  const nameError = getVisibleInlineError(
    inlineErrorsByField.name,
    Boolean(touched.name),
  );
  const emailError = getVisibleInlineError(
    inlineErrorsByField.email,
    Boolean(touched.email),
  );
  const websiteError = getVisibleInlineError(
    inlineErrorsByField.website,
    Boolean(touched.website),
  );
  const descriptionError = getVisibleInlineError(
    inlineErrorsByField.description,
    Boolean(touched.description),
  );

  return (
    <form
      onSubmit={(event) => void handleCreate(event)}
      className={cn("flex flex-col space-y-6 text-left", className)}
    >
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

      <div className="space-y-2">
        <FormFieldLabel htmlFor="create-organization-name" required>
          Organization name
        </FormFieldLabel>
        <FormInput
          id="create-organization-name"
          autoComplete="organization"
          placeholder="Acme Payments"
          value={name}
          error={nameError}
          onChange={(event) =>
            handleFieldChange("name", event.target.value, setName)
          }
        />
      </div>

      <div className="space-y-2">
        <FormFieldLabel htmlFor="create-organization-email" required>
          Business email
        </FormFieldLabel>
        <FormInput
          id="create-organization-email"
          type="email"
          autoComplete="email"
          placeholder="billing@company.com"
          value={email}
          error={emailError}
          onChange={(event) =>
            handleFieldChange("email", event.target.value, setEmail)
          }
        />
      </div>

      <div className="space-y-2">
        <FormFieldLabel htmlFor="create-organization-website">
          Business website
        </FormFieldLabel>
        <FormInput
          id="create-organization-website"
          type="url"
          autoComplete="url"
          placeholder="https://company.com"
          value={website}
          error={websiteError}
          onChange={(event) =>
            handleFieldChange("website", event.target.value, setWebsite)
          }
        />
      </div>

      <div className="space-y-2">
        <FormFieldLabel htmlFor="create-organization-description">
          Business description
        </FormFieldLabel>
        <FormTextarea
          id="create-organization-description"
          rows={4}
          placeholder="What does your business do?"
          value={description}
          error={descriptionError}
          onChange={(event) =>
            handleFieldChange("description", event.target.value, setDescription)
          }
        />
      </div>

      <div>
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
            placeholder={
              <Avatar
                identifier={name.trim() || "Organization"}
                className="h-full w-full"
              />
            }
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
      </div>

      <ValidatedSubmitButton
        text={submitLabel}
        loading={isLoading}
        requiredError={firstRequiredError}
        submitDisabled={hasInlineErrors}
        className="w-full"
      />
    </form>
  );
}
