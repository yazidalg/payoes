"use client";

import { apiFetch } from "@/lib/api-client";
import { useState } from "react";
import { Button } from "@dub/ui";
import { toast } from "sonner";
import type { Organization } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/ui/modals/app-modal";
import { SettingsSection } from "@/ui/settings/settings-section";

export function DeleteBusinessSection({
  organization,
  isOwner,
}: {
  organization: Organization;
  isOwner: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const nameMatches = confirmName.trim() === organization.name;

  function handleOpenChange(open: boolean) {
    setDialogOpen(open);

    if (!open) {
      setConfirmName("");
    }
  }

  async function handleDelete() {
    if (!nameMatches) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await apiFetch(`/api/organizations/${organization.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: confirmName.trim() }),
      });

      const data = (await response.json()) as {
        error?: string;
        nextOrganization?: Organization | null;
      };

      if (!response.ok) {
        toast.error(data.error ?? "Unable to delete business");
        setIsDeleting(false);
        return;
      }

      toast.success("Business deleted");
      setDialogOpen(false);
      setConfirmName("");

      if (data.nextOrganization) {
        await apiFetch("/api/session/active-organization", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: data.nextOrganization.id }),
        });
        window.location.assign("/dashboard/payments");
        return;
      }

      window.location.assign("/onboarding");
    } catch {
      toast.error("Unable to delete business");
      setIsDeleting(false);
    }
  }

  if (!isOwner) {
    return null;
  }

  return (
    <>
      <SettingsSection
        title="Delete business"
        description="Permanently remove this business and all of its data. This action cannot be undone."
        helpText="Payments, customers, API keys, and team access for this business will be deleted."
        action={
          <Button
            type="button"
            variant="danger"
            text="Delete business"
            className="h-9 w-fit"
            onClick={() => setDialogOpen(true)}
          />
        }
      >
        <></>
      </SettingsSection>

      <AppModal
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        title="Delete business?"
        description="This permanently deletes the business and all related data."
        onClose={() => setConfirmName("")}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              onClick={() => handleOpenChange(false)}
            />
            <Button
              type="button"
              variant="danger"
              text="Delete business"
              loading={isDeleting}
              disabled={!nameMatches}
              className="h-9 w-fit"
              onClick={() => void handleDelete()}
            />
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Type{" "}
            <span className="font-medium text-neutral-900">{organization.name}</span>{" "}
            to confirm.
          </p>
          <Input
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            placeholder={organization.name}
            autoComplete="off"
            aria-label="Business name confirmation"
          />
        </div>
      </AppModal>
    </>
  );
}
