"use client";

import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import type { Organization } from "@/lib/db/schema";
import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { AppModal } from "@/ui/modals/app-modal";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

function AddOrganizationModalHelper({ showAddOrganizationModal, setShowAddOrganizationModal }: { showAddOrganizationModal: boolean; setShowAddOrganizationModal: Dispatch<SetStateAction<boolean>> }) {
  const router = useRouter();
  const { user, setActiveOrganization, setOrganizations } = useDashboardShell();

  function handleSuccess(organization: Organization) {
    setOrganizations((current) => {
      if (current.some((item) => item.id === organization.id)) {
        return current;
      }

      return [...current, organization];
    });
    setActiveOrganization(organization);
    toast.success("Successfully created organization!");
    setShowAddOrganizationModal(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AppModal
      open={showAddOrganizationModal}
      onOpenChange={setShowAddOrganizationModal}
      title="Create an organization"
      description="Set up a workspace to manage payments, customers, and your receiving wallet with your team."
      bodyClassName="bg-neutral-50 px-4 py-8 sm:px-16"
    >
      <CreateOrganizationForm
        className="bg-transparent p-0"
        defaultEmail={user.email}
        onSuccess={handleSuccess}
      />
    </AppModal>
  );
}

export function useAddOrganizationModal() {
  const [showAddOrganizationModal, setShowAddOrganizationModal] = useState(false);

  const AddOrganizationModal = useCallback(() => {
    return <AddOrganizationModalHelper showAddOrganizationModal={showAddOrganizationModal} setShowAddOrganizationModal={setShowAddOrganizationModal} />;
  }, [showAddOrganizationModal, setShowAddOrganizationModal]);

  return useMemo(() => ({ setShowAddOrganizationModal, AddOrganizationModal }), [setShowAddOrganizationModal, AddOrganizationModal]);
}
