"use client";

import { useRouter } from "next/navigation";
import { Form } from "@dub/ui";
import { toast } from "sonner";
import type { MemberRole, Organization } from "@/lib/db/schema";
import { OrganizationDetailsCard } from "@/ui/organizations/organization-details-card";
import { OrganizationFieldForm } from "@/ui/organizations/organization-field-form";
import { UploadOrganizationLogo } from "@/ui/organizations/upload-organization-logo";
import { DeleteOrganizationSection } from "@/components/settings/delete-organization-section";

function getPermissionsError(canEdit: boolean) {
  return canEdit
    ? undefined
    : "Only organization owners and admins can update organization settings.";
}

async function patchOrganization(
  organizationId: string,
  data: Record<string, string>,
) {
  const response = await fetch(`/api/organizations/${organizationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "Unable to update organization");
  }
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
  const permissionsError = getPermissionsError(canEdit);
  const formKey = organization.updatedAt.toString();

  async function handleFieldUpdate(
    data: Record<string, string>,
    successMessage: string,
  ) {
    try {
      await patchOrganization(organization.id, data);
      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update organization",
      );
    }
  }

  return (
    <div className="mb-6 space-y-6" key={formKey}>
      <Form
        title="Business Name"
        description="This is the name of your organization on Payoes."
        inputAttrs={{
          name: "name",
          defaultValue: organization.name,
          placeholder: "Acme Payments",
          maxLength: 120,
        }}
        helpText="Max 120 characters."
        disabledTooltip={permissionsError}
        handleSubmit={(data) =>
          handleFieldUpdate(data, "Successfully updated business name!")
        }
      />

      <Form
        title="Business Email"
        description="This email is shown to customers on checkout pages and invoices."
        inputAttrs={{
          name: "email",
          defaultValue: organization.email,
          placeholder: "billing@company.com",
          type: "email",
        }}
        helpText="Use a monitored inbox for payment-related communication."
        disabledTooltip={permissionsError}
        handleSubmit={(data) =>
          handleFieldUpdate(data, "Successfully updated business email!")
        }
      />

      <OrganizationFieldForm
        title="Business Website"
        description="Optional website URL shown on checkout pages and payment links."
        name="website"
        defaultValue={organization.website ?? ""}
        placeholder="https://company.com"
        helpText="Include https:// at the beginning."
        maxLength={200}
        disabledTooltip={permissionsError}
        handleSubmit={(data) =>
          handleFieldUpdate(data, "Successfully updated business website!")
        }
      />

      <OrganizationFieldForm
        title="Business Description"
        description="Optional summary of what your business does."
        name="description"
        defaultValue={organization.description ?? ""}
        placeholder="What does your business do?"
        helpText="Max 500 characters."
        maxLength={500}
        multiline
        disabledTooltip={permissionsError}
        handleSubmit={(data) =>
          handleFieldUpdate(data, "Successfully updated business description!")
        }
      />

      <UploadOrganizationLogo organization={organization} canEdit={canEdit} />

      <OrganizationDetailsCard organization={organization} />

      <DeleteOrganizationSection
        organization={organization}
        isOwner={viewerRole === "owner"}
      />
    </div>
  );
}
