import { randomBytes } from "crypto";
import { and, asc, count, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizationInvites,
  organizationMembers,
  organizations,
  users,
  type MemberRole,
} from "@/lib/db/schema";
import { sendOrganizationInviteEmail } from "@/lib/email/send-organization-invite";
import { findUserByEmail } from "@/lib/auth/users";

import { INVITE_TTL_DAYS } from "@/constants/organizations/invites";

export class MembersServiceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "forbidden"
      | "not_found"
      | "conflict"
      | "invalid"
      | "expired"
      | "email_mismatch"
  ) {
    super(message);
    this.name = "MembersServiceError";
  }
}

export function assertCanManageTeam(role: MemberRole) {
  if (role !== "owner" && role !== "admin") {
    throw new MembersServiceError("You do not have permission to manage team members", "forbidden");
  }
}

export async function getMembershipForUser(organizationId: string, userId: string) {
  return db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, userId)
    ),
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createInviteToken() {
  return randomBytes(32).toString("hex");
}

function inviteExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
  return expiresAt;
}

function isInvitePending(invite: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}) {
  if (invite.acceptedAt || invite.revokedAt) {
    return false;
  }

  return invite.expiresAt > new Date();
}

export async function listOrganizationMembers(organizationId: string) {
  const rows = await db
    .select({
      id: organizationMembers.id,
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      joinedAt: organizationMembers.createdAt,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId))
    .orderBy(asc(organizationMembers.createdAt));

  return rows;
}

export async function listPendingInvites(organizationId: string) {
  const now = new Date();

  const rows = await db
    .select({
      id: organizationInvites.id,
      email: organizationInvites.email,
      role: organizationInvites.role,
      expiresAt: organizationInvites.expiresAt,
      createdAt: organizationInvites.createdAt,
      inviterName: users.name,
      inviterEmail: users.email,
    })
    .from(organizationInvites)
    .innerJoin(users, eq(organizationInvites.invitedBy, users.id))
    .where(
      and(
        eq(organizationInvites.organizationId, organizationId),
        isNull(organizationInvites.acceptedAt),
        isNull(organizationInvites.revokedAt),
        gt(organizationInvites.expiresAt, now)
      )
    )
    .orderBy(asc(organizationInvites.createdAt));

  return rows;
}

async function assertNotExistingMember(organizationId: string, email: string) {
  const member = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(users.email, email)
      )
    )
    .limit(1);

  if (member.length > 0) {
    throw new MembersServiceError("This user is already a team member", "conflict");
  }
}

async function getPendingInviteByEmail(organizationId: string, email: string) {
  const now = new Date();

  const [invite] = await db
    .select()
    .from(organizationInvites)
    .where(
      and(
        eq(organizationInvites.organizationId, organizationId),
        eq(organizationInvites.email, email),
        isNull(organizationInvites.acceptedAt),
        isNull(organizationInvites.revokedAt),
        gt(organizationInvites.expiresAt, now)
      )
    )
    .limit(1);

  return invite ?? null;
}

async function getInviteByEmail(organizationId: string, email: string) {
  const [invite] = await db
    .select()
    .from(organizationInvites)
    .where(
      and(
        eq(organizationInvites.organizationId, organizationId),
        eq(organizationInvites.email, email)
      )
    )
    .limit(1);

  return invite ?? null;
}

async function refreshOrganizationInvite(input: {
  inviteId: string;
  role: "admin" | "member";
  invitedByUserId: string;
}) {
  const [invite] = await db
    .update(organizationInvites)
    .set({
      role: input.role,
      token: createInviteToken(),
      invitedBy: input.invitedByUserId,
      expiresAt: inviteExpiresAt(),
      acceptedAt: null,
      revokedAt: null,
    })
    .where(eq(organizationInvites.id, input.inviteId))
    .returning();

  if (!invite) {
    throw new MembersServiceError("Invite not found", "not_found");
  }

  await sendInviteEmailForRow(invite.id);

  return invite;
}

async function sendInviteEmailForRow(inviteId: string) {
  const [row] = await db
    .select({
      invite: organizationInvites,
      organizationName: organizations.name,
      inviterName: users.name,
      inviterEmail: users.email,
    })
    .from(organizationInvites)
    .innerJoin(organizations, eq(organizationInvites.organizationId, organizations.id))
    .innerJoin(users, eq(organizationInvites.invitedBy, users.id))
    .where(eq(organizationInvites.id, inviteId))
    .limit(1);

  if (!row || !isInvitePending(row.invite)) {
    throw new MembersServiceError("Invite is no longer valid", "not_found");
  }

  if (row.invite.role !== "admin" && row.invite.role !== "member") {
    throw new MembersServiceError("Invalid invite role", "invalid");
  }

  await sendOrganizationInviteEmail({
    to: row.invite.email,
    organizationName: row.organizationName,
    role: row.invite.role,
    inviterName: row.inviterName,
    inviterEmail: row.inviterEmail,
    token: row.invite.token,
    expiresAt: row.invite.expiresAt,
  });
}

export async function createOrganizationInvite(input: {
  organizationId: string;
  email: string;
  role: "admin" | "member";
  invitedByUserId: string;
}) {
  const email = normalizeEmail(input.email);
  await assertNotExistingMember(input.organizationId, email);

  const existingPending = await getPendingInviteByEmail(input.organizationId, email);

  if (existingPending) {
    await sendInviteEmailForRow(existingPending.id);
    return existingPending;
  }

  const existingInvite = await getInviteByEmail(input.organizationId, email);

  if (existingInvite) {
    return refreshOrganizationInvite({
      inviteId: existingInvite.id,
      role: input.role,
      invitedByUserId: input.invitedByUserId,
    });
  }

  const [invite] = await db
    .insert(organizationInvites)
    .values({
      organizationId: input.organizationId,
      email,
      role: input.role,
      token: createInviteToken(),
      invitedBy: input.invitedByUserId,
      expiresAt: inviteExpiresAt(),
    })
    .returning();

  await sendInviteEmailForRow(invite.id);

  return invite;
}

export async function resendOrganizationInvite(input: {
  organizationId: string;
  inviteId: string;
}) {
  const [invite] = await db
    .select()
    .from(organizationInvites)
    .where(
      and(
        eq(organizationInvites.id, input.inviteId),
        eq(organizationInvites.organizationId, input.organizationId)
      )
    )
    .limit(1);

  if (!invite || !isInvitePending(invite)) {
    throw new MembersServiceError("Invite not found", "not_found");
  }

  const [updated] = await db
    .update(organizationInvites)
    .set({ expiresAt: inviteExpiresAt() })
    .where(eq(organizationInvites.id, invite.id))
    .returning();

  await sendInviteEmailForRow(updated.id);

  return updated;
}

export async function revokeOrganizationInvite(input: {
  organizationId: string;
  inviteId: string;
}) {
  const [invite] = await db
    .select()
    .from(organizationInvites)
    .where(
      and(
        eq(organizationInvites.id, input.inviteId),
        eq(organizationInvites.organizationId, input.organizationId)
      )
    )
    .limit(1);

  if (!invite || invite.acceptedAt || invite.revokedAt) {
    throw new MembersServiceError("Invite not found", "not_found");
  }

  const [updated] = await db
    .update(organizationInvites)
    .set({ revokedAt: new Date() })
    .where(eq(organizationInvites.id, invite.id))
    .returning();

  return updated;
}

export async function getInvitePreview(token: string) {
  const data = await getInvitePageData(token);
  return data?.invite ?? null;
}

export async function getInvitePageData(token: string) {
  const [row] = await db
    .select({
      invite: organizationInvites,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      logoUrl: organizations.logoUrl,
      logoInitials: organizations.logoInitials,
    })
    .from(organizationInvites)
    .innerJoin(organizations, eq(organizationInvites.organizationId, organizations.id))
    .where(eq(organizationInvites.token, token))
    .limit(1);

  if (!row) {
    return null;
  }

  const status: "pending" | "accepted" | "revoked" | "expired" = row.invite.acceptedAt
    ? "accepted"
    : row.invite.revokedAt
      ? "revoked"
      : row.invite.expiresAt <= new Date()
        ? "expired"
        : "pending";

  const teamMembers = await listOrganizationMembers(row.organizationId);

  return {
    invite: {
      email: row.invite.email,
      role: row.invite.role,
      organizationName: row.organizationName,
      organizationSlug: row.organizationSlug,
      expiresAt: row.invite.expiresAt,
      status,
    },
    organization: {
      id: row.organizationId,
      name: row.organizationName,
      slug: row.organizationSlug,
      logoUrl: row.logoUrl,
      logoInitials: row.logoInitials,
    },
    teamMembers: teamMembers.map((member) => ({
      id: member.userId,
      name: member.name,
      email: member.email,
      image: member.image,
    })),
  };
}

export async function getUserOrganizationCount(userId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  return result?.count ?? 0;
}

export async function getPendingInviteTokenForEmail(
  email: string,
): Promise<string | null> {
  const now = new Date();
  const normalizedEmail = normalizeEmail(email);

  const [invite] = await db
    .select({ token: organizationInvites.token })
    .from(organizationInvites)
    .where(
      and(
        eq(organizationInvites.email, normalizedEmail),
        isNull(organizationInvites.acceptedAt),
        isNull(organizationInvites.revokedAt),
        gt(organizationInvites.expiresAt, now),
      ),
    )
    .orderBy(desc(organizationInvites.createdAt))
    .limit(1);

  return invite?.token ?? null;
}

export async function acceptOrganizationInvite(input: {
  token: string;
  userId: string;
  userEmail: string;
}) {
  const [row] = await db
    .select({
      invite: organizationInvites,
      organizationId: organizations.id,
    })
    .from(organizationInvites)
    .innerJoin(organizations, eq(organizationInvites.organizationId, organizations.id))
    .where(eq(organizationInvites.token, input.token))
    .limit(1);

  if (!row) {
    throw new MembersServiceError("Invitation not found", "not_found");
  }

  if (row.invite.acceptedAt) {
    throw new MembersServiceError("This invitation has already been accepted", "conflict");
  }

  if (row.invite.revokedAt) {
    throw new MembersServiceError("This invitation has been revoked", "invalid");
  }

  if (row.invite.expiresAt <= new Date()) {
    throw new MembersServiceError("This invitation has expired", "expired");
  }

  const normalizedUserEmail = normalizeEmail(input.userEmail);
  const normalizedInviteEmail = normalizeEmail(row.invite.email);

  if (normalizedUserEmail !== normalizedInviteEmail) {
    throw new MembersServiceError(
      "Sign in with the email address that received this invitation",
      "email_mismatch"
    );
  }

  const existingMembership = await getMembershipForUser(row.organizationId, input.userId);

  if (existingMembership) {
    await db
      .update(organizationInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(organizationInvites.id, row.invite.id));

    return { organizationId: row.organizationId, alreadyMember: true };
  }

  if (row.invite.role !== "admin" && row.invite.role !== "member") {
    throw new MembersServiceError("Invalid invite role", "invalid");
  }

  await db.transaction(async (tx) => {
    await tx.insert(organizationMembers).values({
      organizationId: row.organizationId,
      userId: input.userId,
      role: row.invite.role,
    });

    await tx
      .update(organizationInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(organizationInvites.id, row.invite.id));
  });

  return { organizationId: row.organizationId, alreadyMember: false };
}

export async function updateMemberRole(input: {
  organizationId: string;
  targetUserId: string;
  role: "admin" | "member";
}) {
  const [target] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, input.targetUserId)
      )
    )
    .limit(1);

  if (!target) {
    throw new MembersServiceError("Member not found", "not_found");
  }

  if (target.role === "owner") {
    throw new MembersServiceError("Cannot change the owner role", "forbidden");
  }

  const [updated] = await db
    .update(organizationMembers)
    .set({ role: input.role })
    .where(eq(organizationMembers.id, target.id))
    .returning();

  return updated;
}

export async function removeOrganizationMember(input: {
  organizationId: string;
  targetUserId: string;
  actorUserId: string;
}) {
  const [target] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, input.targetUserId)
      )
    )
    .limit(1);

  if (!target) {
    throw new MembersServiceError("Member not found", "not_found");
  }

  if (target.role === "owner") {
    throw new MembersServiceError("Cannot remove the organization owner", "forbidden");
  }

  if (target.userId === input.actorUserId) {
    throw new MembersServiceError("You cannot remove yourself", "forbidden");
  }

  await db.delete(organizationMembers).where(eq(organizationMembers.id, target.id));

  return { removed: true };
}

export async function isEmailAlreadyMember(organizationId: string, email: string) {
  const normalized = normalizeEmail(email);
  const user = await findUserByEmail(normalized);

  if (!user) {
    return false;
  }

  const membership = await getMembershipForUser(organizationId, user.id);
  return Boolean(membership);
}
