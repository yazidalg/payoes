import type { MemberRole } from "@/lib/db/schema";

export type TeamMemberRow = {
  kind: "active";
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: MemberRole;
  joinedAt: string;
};

export type TeamInviteRow = {
  kind: "pending";
  id: string;
  email: string;
  role: MemberRole;
  createdAt: string;
  expiresAt: string;
  inviterName: string;
};

export type TeamRow = TeamMemberRow | TeamInviteRow;

export function isActiveTeamRow(row: TeamRow): row is TeamMemberRow {
  return row.kind === "active";
}

export function isPendingTeamRow(row: TeamRow): row is TeamInviteRow {
  return row.kind === "pending";
}
