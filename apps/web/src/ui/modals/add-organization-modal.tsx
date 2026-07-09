"use client";

import { Logo } from "@/components/shared/logo";
import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import type { Organization } from "@/lib/db/schema";
import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { Modal } from "@dub/ui";
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
    <Modal showModal={showAddOrganizationModal} setShowModal={setShowAddOrganizationModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        <h3 className="text-lg font-medium">Create an organization</h3>
        <p className="-translate-y-2 text-balance text-center text-xs text-neutral-500">Set up a workspace to manage payments, customers, and your receiving wallet with your team.</p>
      </div>

      <CreateOrganizationForm className="bg-neutral-50 px-4 py-8 sm:px-16" defaultEmail={user.email} onSuccess={handleSuccess} />
    </Modal>
  );
}

export function useAddOrganizationModal() {
  const [showAddOrganizationModal, setShowAddOrganizationModal] = useState(false);

  const AddOrganizationModal = useCallback(() => {
    return <AddOrganizationModalHelper showAddOrganizationModal={showAddOrganizationModal} setShowAddOrganizationModal={setShowAddOrganizationModal} />;
  }, [showAddOrganizationModal, setShowAddOrganizationModal]);

  return useMemo(() => ({ setShowAddOrganizationModal, AddOrganizationModal }), [setShowAddOrganizationModal, AddOrganizationModal]);
}
