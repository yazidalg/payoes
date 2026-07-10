"use client";

import { useCallback, useState } from "react";
import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { InviteMemberDialog } from "@/components/settings/invite-member-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAsyncData } from "@/hooks/use-async-data";
import type { MemberRole } from "@/lib/db/schema";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import { UserPlus, Users } from "@dub/ui/icons";

type MemberRow = {
  id: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  name: string;
  email: string;
  image: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  createdAt: string;
  inviterName: string;
  inviterEmail: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RoleBadge({ role }: { role: MemberRole }) {
  const label = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <span className="bg-muted text-foreground inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize">
      {label}
    </span>
  );
}

function MemberInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span className="bg-muted text-muted-foreground inline-flex size-8 items-center justify-center rounded-full text-xs font-medium">
      {initials || "?"}
    </span>
  );
}

export function TeamMembersPanel({
  organizationId,
  viewerRole,
  viewerUserId,
}: {
  organizationId: string;
  viewerRole: MemberRole;
  viewerUserId: string;
}) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const canManageTeam = viewerRole === "owner" || viewerRole === "admin";
  const canChangeRoles = viewerRole === "owner";

  const fetchMembers = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/members`);
    const data = (await response.json()) as { members?: MemberRow[] };

    if (!response.ok) {
      throw new Error("Unable to load team members");
    }

    return data.members ?? [];
  }, [organizationId]);

  const fetchInvites = useCallback(async () => {
    if (!canManageTeam) {
      return [];
    }

    const response = await fetch(`/api/organizations/${organizationId}/invites`);
    const data = (await response.json()) as { invites?: InviteRow[] };

    if (!response.ok) {
      return [];
    }

    return data.invites ?? [];
  }, [canManageTeam, organizationId]);

  const {
    data: members,
    reload: reloadMembers,
    isLoading: membersLoading,
  } = useAsyncData(fetchMembers, [organizationId]);

  const {
    data: invites,
    reload: reloadInvites,
    isLoading: invitesLoading,
  } = useAsyncData(fetchInvites, [organizationId, canManageTeam]);

  async function handleChangeRole(userId: string, role: "admin" | "member") {
    const response = await fetch(
      `/api/organizations/${organizationId}/members/${userId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }
    );

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to update role");
      return;
    }

    toast.success("Role updated");
    reloadMembers();
  }

  async function handleRemoveMember(userId: string) {
    const response = await fetch(
      `/api/organizations/${organizationId}/members/${userId}`,
      { method: "DELETE" }
    );

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to remove member");
      return;
    }

    toast.success("Member removed");
    reloadMembers();
  }

  async function handleResendInvite(inviteId: string) {
    const response = await fetch(
      `/api/organizations/${organizationId}/invites/${inviteId}`,
      { method: "POST" }
    );

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to resend invitation");
      return;
    }

    toast.success("Invitation resent");
    reloadInvites();
  }

  async function handleRevokeInvite(inviteId: string) {
    const response = await fetch(
      `/api/organizations/${organizationId}/invites/${inviteId}`,
      { method: "DELETE" }
    );

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Unable to revoke invitation");
      return;
    }

    toast.success("Invitation revoked");
    reloadInvites();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who can access this organization and their permissions.
          </p>
        </div>
        {canManageTeam ? (
          <Button type="button" onClick={() => setIsInviteOpen(true)}>
            <PlusIcon />
            Invite member
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active members</CardTitle>
          <CardDescription>People with access to this organization.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {membersLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading members...
            </p>
          ) : (members ?? []).length === 0 ? (
            <TableEmptyState
              title="No team members yet"
              description="Invite teammates to collaborate on this organization."
              icon={<Users className="size-4 text-neutral-700" />}
              className="border-0"
            />
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    {canManageTeam ? (
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {(members ?? []).map((member) => {
                    const canRemove =
                      canManageTeam &&
                      member.role !== "owner" &&
                      member.userId !== viewerUserId;
                    const canEditRole =
                      canChangeRoles && member.role !== "owner";

                    return (
                      <tr
                        key={member.id}
                        className="border-t border-border/60 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <MemberInitials name={member.name} />
                            <span className="font-medium">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                        <td className="px-4 py-3">
                          <RoleBadge role={member.role} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(member.joinedAt)}
                        </td>
                        {canManageTeam ? (
                          <td className="px-4 py-3 text-right">
                            {canEditRole || canRemove ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label="Member actions"
                                    />
                                  }
                                >
                                  <MoreHorizontalIcon />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEditRole ? (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleChangeRole(member.userId, "admin")
                                        }
                                      >
                                        Set as admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleChangeRole(member.userId, "member")
                                        }
                                      >
                                        Set as member
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
                                  {canRemove ? (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => handleRemoveMember(member.userId)}
                                    >
                                      Remove member
                                    </DropdownMenuItem>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {canManageTeam ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>
              Invitations that have not been accepted yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {invitesLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Loading invitations...
              </p>
            ) : (invites ?? []).length === 0 ? (
              <TableEmptyState
                title="No pending invitations"
                description="Invitations you send will appear here until they are accepted or expire."
                icon={<UserPlus className="size-4 text-neutral-700" />}
                className="border-0 md:min-h-[240px]"
              />
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Invited by</th>
                      <th className="px-4 py-3 font-medium">Sent</th>
                      <th className="px-4 py-3 font-medium">Expires</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invites ?? []).map((invite) => (
                      <tr
                        key={invite.id}
                        className="border-t border-border/60 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium">{invite.email}</td>
                        <td className="px-4 py-3">
                          <RoleBadge role={invite.role} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {invite.inviterName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(invite.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(invite.expiresAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Invite actions"
                                />
                              }
                            >
                              <MoreHorizontalIcon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleResendInvite(invite.id)}
                              >
                                Resend email
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleRevokeInvite(invite.id)}
                              >
                                Revoke
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <InviteMemberDialog
        organizationId={organizationId}
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onInvited={() => {
          reloadMembers();
          reloadInvites();
        }}
      />
    </div>
  );
}
