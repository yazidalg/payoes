"use client";

import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Form } from "@dub/ui";
import { toast } from "sonner";
import type { MemberRole, Organization } from "@/lib/db/schema";
import { BusinessDetailsCard } from "@/ui/business/business-details-card";
import { BusinessFieldForm } from "@/ui/business/business-field-form";
import { UploadBusinessLogo } from "@/ui/business/upload-business-logo";
import { DeleteBusinessSection } from "@/components/settings/delete-business-section";

function getPermissionsError(canEdit: boolean) {
  return canEdit
    ? undefined
    : "Only business owners and admins can update business settings.";
}

async function patchOrganization(
  organizationId: string,
  data: Record<string, string>,
) {
  const response = await apiFetch(`/api/organizations/${organizationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "Unable to update business");
  }
}

export function BusinessSettingsPanel({
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
        error instanceof Error ? error.message : "Unable to update business",
      );
    }
  }

  return (
    <div className="mb-6 space-y-6" key={formKey}>
      <Form
        title="Business Name"
        description="This is the name of your business on Payoes."
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

      <BusinessFieldForm
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

      <BusinessFieldForm
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

      <UploadBusinessLogo organization={organization} canEdit={canEdit} />

      <BusinessDetailsCard organization={organization} />

      <DeleteBusinessSection
        organization={organization}
        isOwner={viewerRole === "owner"}
      />
    </div>
  );
}
