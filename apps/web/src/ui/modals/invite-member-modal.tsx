"use client";

import { InviteTeammatesForm } from "@/ui/team/invite-teammates-form";
import { Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

function InviteMemberModal({
  organizationId,
  showInviteMemberModal,
  setShowInviteMemberModal,
  onInvited,
}: {
  organizationId: string;
  showInviteMemberModal: boolean;
  setShowInviteMemberModal: Dispatch<SetStateAction<boolean>>;
  onInvited?: () => void;
}) {
  return (
    <Modal
      showModal={showInviteMemberModal}
      setShowModal={setShowInviteMemberModal}
      className="max-h-[95dvh]"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Invite teammates</h3>
        <p className="text-sm text-neutral-500">
          Invite teammates with different roles and permissions. Invitations will
          be valid for 14 days.
        </p>
      </div>
      <InviteTeammatesForm
        organizationId={organizationId}
        onSuccess={() => {
          setShowInviteMemberModal(false);
          onInvited?.();
        }}
        className="bg-neutral-50 px-4 py-4 sm:px-6"
      />
    </Modal>
  );
}

export function useInviteMemberModal({
  organizationId,
  onInvited,
}: {
  organizationId: string;
  onInvited?: () => void;
}) {
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);

  const InviteMemberModalCallback = useCallback(() => {
    return (
      <InviteMemberModal
        organizationId={organizationId}
        showInviteMemberModal={showInviteMemberModal}
        setShowInviteMemberModal={setShowInviteMemberModal}
        onInvited={onInvited}
      />
    );
  }, [
    organizationId,
    showInviteMemberModal,
    onInvited,
  ]);

  return useMemo(
    () => ({
      setShowInviteMemberModal,
      InviteMemberModal: InviteMemberModalCallback,
    }),
    [setShowInviteMemberModal, InviteMemberModalCallback],
  );
}
