"use client";

import { useCallback, useMemo, useState } from "react";
import { useAsyncData } from "@/hooks/use-async-data";
import type { MemberRole } from "@/lib/db/schema";
import {
  isActiveTeamRow,
  isPendingTeamRow,
  type TeamRow,
} from "@/lib/team/types";
import { TeamMembersTableSkeleton } from "@/ui/team/team-members-table-skeleton";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import {
  Avatar,
  Button,
  MenuItem,
  Popover,
  StatusBadge,
  Table,
  usePagination,
  useTable,
} from "@dub/ui";
import { Dots, PenWriting, Trash, Users } from "@dub/ui/icons";
import { formatDate, timeAgo } from "@dub/utils";
import type { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { toast } from "sonner";

type MemberResponse = {
  id: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  name: string;
  email: string;
  image: string | null;
};

type InviteResponse = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  createdAt: string;
  inviterName: string;
};

function formatRole(role: MemberRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function TeamMembersTable({
  organizationId,
  viewerRole,
  viewerUserId,
  refreshKey = 0,
  onCreateClick,
}: {
  organizationId: string;
  viewerRole: MemberRole;
  viewerUserId: string;
  refreshKey?: number;
  onCreateClick?: () => void;
}) {
  const { pagination, setPagination } = usePagination();
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const canManageTeam = viewerRole === "owner" || viewerRole === "admin";
  const canChangeRoles = viewerRole === "owner";

  const fetchTeamRows = useCallback(async () => {
    const membersResponse = await fetch(
      `/api/organizations/${organizationId}/members`,
    );
    const membersData = (await membersResponse.json()) as {
      members?: MemberResponse[];
      error?: string;
    };

    if (!membersResponse.ok) {
      throw new Error(membersData.error ?? "Unable to load team members");
    }

    const activeRows: TeamRow[] = (membersData.members ?? []).map((member) => ({
      kind: "active",
      id: member.id,
      userId: member.userId,
      name: member.name,
      email: member.email,
      image: member.image,
      role: member.role,
      joinedAt: member.joinedAt,
    }));

    if (!canManageTeam) {
      return activeRows;
    }

    const invitesResponse = await fetch(
      `/api/organizations/${organizationId}/invites`,
    );
    const invitesData = (await invitesResponse.json()) as {
      invites?: InviteResponse[];
    };

    const pendingRows: TeamRow[] = (invitesData.invites ?? []).map((invite) => ({
      kind: "pending",
      id: invite.id,
      email: invite.email,
      role: invite.role,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      inviterName: invite.inviterName,
    }));

    return [...activeRows, ...pendingRows];
  }, [canManageTeam, organizationId]);

  const {
    data: rows,
    error,
    isLoading,
    reload,
  } = useAsyncData(fetchTeamRows, [
    organizationId,
    refreshKey,
    localRefreshKey,
    canManageTeam,
  ]);

  const refreshRows = useCallback(() => {
    setLocalRefreshKey((current) => current + 1);
    reload();
  }, [reload]);

  const handleChangeRole = useCallback(
    async (userId: string, role: "admin" | "member") => {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update role");
      }
    },
    [organizationId],
  );

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${userId}`,
        { method: "DELETE" },
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to remove member");
      }
    },
    [organizationId],
  );

  const handleResendInvite = useCallback(
    async (inviteId: string) => {
      const response = await fetch(
        `/api/organizations/${organizationId}/invites/${inviteId}`,
        { method: "POST" },
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to resend invitation");
      }
    },
    [organizationId],
  );

  const handleRevokeInvite = useCallback(
    async (inviteId: string) => {
      const response = await fetch(
        `/api/organizations/${organizationId}/invites/${inviteId}`,
        { method: "DELETE" },
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to revoke invitation");
      }
    },
    [organizationId],
  );

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        minSize: 280,
        cell: ({ row }: { row: Row<TeamRow> }) => {
          const item = row.original;
          const isCurrentUser =
            isActiveTeamRow(item) && item.userId === viewerUserId;

          if (isPendingTeamRow(item)) {
            return (
              <div className="flex items-center space-x-3">
                <Avatar identifier={item.email} className="size-8" />
                <div className="flex flex-col">
                  <h3 className="text-sm font-medium">{item.email}</h3>
                  <p className="text-xs text-neutral-500">
                    Invited {timeAgo(new Date(item.createdAt))}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div className="flex items-center space-x-3">
              <Avatar
                imageUrl={item.image}
                identifier={item.name || item.email}
                className="size-8"
              />
              <div className="flex flex-col">
                <h3 className="text-sm font-medium">
                  {item.name || item.email}
                  {isCurrentUser ? (
                    <span className="ml-1 text-neutral-500">(You)</span>
                  ) : null}
                </h3>
                <p className="text-xs text-neutral-500">{item.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: "role",
        header: "Role",
        accessorKey: "role",
        minSize: 100,
        cell: ({ row }: { row: Row<TeamRow> }) => (
          <span className="text-sm capitalize text-neutral-600">
            {formatRole(row.original.role)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "kind",
        minSize: 120,
        cell: ({ row }: { row: Row<TeamRow> }) =>
          isPendingTeamRow(row.original) ? (
            <StatusBadge variant="pending">Pending</StatusBadge>
          ) : (
            <StatusBadge variant="success">Active</StatusBadge>
          ),
      },
      {
        id: "joined",
        header: "Joined",
        accessorKey: "joinedAt",
        minSize: 120,
        cell: ({ row }: { row: Row<TeamRow> }) => {
          const item = row.original;

          if (isPendingTeamRow(item)) {
            return (
              <span className="text-sm text-neutral-500">
                Expires {formatDate(item.expiresAt, { month: "short" })}
              </span>
            );
          }

          return (
            <span className="text-sm text-neutral-500">
              {formatDate(item.joinedAt, { month: "short" })}
            </span>
          );
        },
      },
      {
        id: "menu",
        enableHiding: false,
        cell: ({ row }: { row: Row<TeamRow> }) => (
          <RowMenuButton
            row={row}
            canManageTeam={canManageTeam}
            canChangeRoles={canChangeRoles}
            viewerUserId={viewerUserId}
            onChangeRole={handleChangeRole}
            onRemoveMember={handleRemoveMember}
            onResendInvite={handleResendInvite}
            onRevokeInvite={handleRevokeInvite}
            onChanged={refreshRows}
          />
        ),
      },
    ],
    [
      canChangeRoles,
      canManageTeam,
      handleChangeRole,
      handleRemoveMember,
      handleResendInvite,
      handleRevokeInvite,
      refreshRows,
      viewerUserId,
    ],
  );

  const { table, ...tableProps } = useTable({
    data: rows ?? [],
    columns,
    columnPinning: { right: ["menu"] },
    pagination,
    onPaginationChange: setPagination,
    getRowId: (row) => `${row.kind}-${row.id}`,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `team member${plural ? "s" : ""}`,
    rowCount: rows?.length ?? 0,
    error: error ?? undefined,
  });

  const hasRows = (rows?.length ?? 0) > 0;

  const createButton = onCreateClick ? (
    <Button
      type="button"
      variant="primary"
      text="Invite member"
      className="h-9"
      onClick={onCreateClick}
    />
  ) : undefined;

  return (
    <div className="grid grid-cols-1">
      {isLoading ? (
        <TeamMembersTableSkeleton />
      ) : hasRows ? (
        <Table {...tableProps} table={table} />
      ) : (
        <TableEmptyState
          title="No team members yet"
          description="Invite teammates to collaborate on this organization."
          icon={<Users className="size-4 text-neutral-700" />}
          addButton={canManageTeam ? createButton : undefined}
        />
      )}
    </div>
  );
}

function RowMenuButton({
  row,
  canManageTeam,
  canChangeRoles,
  viewerUserId,
  onChangeRole,
  onRemoveMember,
  onResendInvite,
  onRevokeInvite,
  onChanged,
}: {
  row: Row<TeamRow>;
  canManageTeam: boolean;
  canChangeRoles: boolean;
  viewerUserId: string;
  onChangeRole: (userId: string, role: "admin" | "member") => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onResendInvite: (inviteId: string) => Promise<void>;
  onRevokeInvite: (inviteId: string) => Promise<void>;
  onChanged: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const item = row.original;

  if (!canManageTeam) {
    return null;
  }

  if (isPendingTeamRow(item)) {
    return (
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[160px]">
              <MenuItem
                as={Command.Item}
                icon={PenWriting}
                onSelect={() => {
                  setIsOpen(false);
                  toast.promise(onResendInvite(item.id), {
                    loading: "Resending invitation...",
                    success: () => {
                      onChanged();
                      return "Invitation resent";
                    },
                    error: (err) =>
                      err instanceof Error
                        ? err.message
                        : "Unable to resend invitation",
                  });
                }}
              >
                Resend email
              </MenuItem>
              <MenuItem
                as={Command.Item}
                icon={Trash}
                variant="danger"
                onSelect={() => {
                  setIsOpen(false);
                  toast.promise(onRevokeInvite(item.id), {
                    loading: "Revoking invitation...",
                    success: () => {
                      onChanged();
                      return "Invitation revoked";
                    },
                    error: (err) =>
                      err instanceof Error
                        ? err.message
                        : "Unable to revoke invitation",
                  });
                }}
              >
                Revoke
              </MenuItem>
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="size-8 shrink-0 whitespace-nowrap rounded-lg p-0"
          variant="outline"
          icon={<Dots className="h-4 w-4 shrink-0" />}
        />
      </Popover>
    );
  }

  const canRemove = item.role !== "owner" && item.userId !== viewerUserId;
  const canEditRole = canChangeRoles && item.role !== "owner";

  if (!canRemove && !canEditRole) {
    return null;
  }

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[160px]">
            {canEditRole ? (
              <>
                <MenuItem
                  as={Command.Item}
                  icon={PenWriting}
                  onSelect={() => {
                    setIsOpen(false);
                    toast.promise(onChangeRole(item.userId, "admin"), {
                      loading: "Updating role...",
                      success: () => {
                        onChanged();
                        return "Role updated";
                      },
                      error: (err) =>
                        err instanceof Error
                          ? err.message
                          : "Unable to update role",
                    });
                  }}
                >
                  Set as admin
                </MenuItem>
                <MenuItem
                  as={Command.Item}
                  icon={PenWriting}
                  onSelect={() => {
                    setIsOpen(false);
                    toast.promise(onChangeRole(item.userId, "member"), {
                      loading: "Updating role...",
                      success: () => {
                        onChanged();
                        return "Role updated";
                      },
                      error: (err) =>
                        err instanceof Error
                          ? err.message
                          : "Unable to update role",
                    });
                  }}
                >
                  Set as member
                </MenuItem>
              </>
            ) : null}
            {canRemove ? (
              <MenuItem
                as={Command.Item}
                icon={Trash}
                variant="danger"
                onSelect={() => {
                  setIsOpen(false);
                  toast.promise(onRemoveMember(item.userId), {
                    loading: "Removing member...",
                    success: () => {
                      onChanged();
                      return "Member removed";
                    },
                    error: (err) =>
                      err instanceof Error
                        ? err.message
                        : "Unable to remove member",
                  });
                }}
              >
                Remove member
              </MenuItem>
            ) : null}
          </Command.List>
        </Command>
      }
      align="end"
    >
      <Button
        type="button"
        className="size-8 shrink-0 whitespace-nowrap rounded-lg p-0"
        variant="outline"
        icon={<Dots className="h-4 w-4 shrink-0" />}
      />
    </Popover>
  );
}
