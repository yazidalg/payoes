"use client";

import { useMemo, useState } from "react";
import type { MemberRole } from "@/lib/db/schema";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import { useInviteMemberModal } from "@/ui/modals/invite-member-modal";
import { TeamMembersTable } from "@/ui/team/team-members-table";
import { Button } from "@dub/ui";
import { Plus2 } from "@dub/ui/icons";

export function TeamMembersPanel({
  organizationId,
  viewerRole,
  viewerUserId,
}: {
  organizationId: string;
  viewerRole: MemberRole;
  viewerUserId: string;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const canManageTeam = viewerRole === "owner" || viewerRole === "admin";

  const { InviteMemberModal, setShowInviteMemberModal } = useInviteMemberModal({
    organizationId,
    onInvited: () => setRefreshKey((current) => current + 1),
  });

  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title:
          "Manage who can access this business and their permissions.",
      },
      controls: canManageTeam ? (
        <Button
          type="button"
          variant="primary"
          text="Invite member"
          icon={<Plus2 className="size-4" />}
          className="h-9 w-fit"
          onClick={() => setShowInviteMemberModal(true)}
        />
      ) : undefined,
    }),
    [canManageTeam, setShowInviteMemberModal],
  );

  useSetDashboardPageHeader(headerOverride);

  return (
    <>
      <InviteMemberModal />

      <TeamMembersTable
        organizationId={organizationId}
        viewerRole={viewerRole}
        viewerUserId={viewerUserId}
        refreshKey={refreshKey}
        onCreateClick={
          canManageTeam ? () => setShowInviteMemberModal(true) : undefined
        }
      />
    </>
  );
}
