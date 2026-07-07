import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  type Organization,
} from "@/lib/db/schema";
import { getInitials, slugify } from "@/lib/utils/initials";

async function createUniqueSlug(name: string) {
  const base = slugify(name) || "workspace";
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, candidate),
      columns: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export async function userHasOrganization(userId: string) {
  const membership = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, userId),
    columns: { id: true },
  });

  return Boolean(membership);
}

export async function getOrganizationsForUser(userId: string) {
  const memberships = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.userId, userId),
    with: {
      organization: true,
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  return memberships.map((membership) => membership.organization);
}

export async function createOrganizationForUser(
  userId: string,
  input: {
    name: string;
    email: string;
    website?: string | null;
    description?: string | null;
    logoUrl?: string | null;
  }
): Promise<Organization> {
  const slug = await createUniqueSlug(input.name);
  const logoInitials = getInitials(input.name);

  const [organization] = await db
    .insert(organizations)
    .values({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      website: input.website?.trim() || null,
      description: input.description?.trim() || null,
      logoUrl: input.logoUrl ?? null,
      logoInitials,
      slug,
    })
    .returning();

  await db.insert(organizationMembers).values({
    organizationId: organization.id,
    userId,
    role: "owner",
  });

  return organization;
}

export async function getOrganizationById(organizationId: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
}

export async function updateOrganization(
  organizationId: string,
  input: {
    name: string;
    email: string;
    website?: string | null;
    description?: string | null;
    logoUrl?: string | null;
  }
) {
  const logoInitials = getInitials(input.name);

  const [organization] = await db
    .update(organizations)
    .set({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      website: input.website?.trim() || null,
      description: input.description?.trim() || null,
      logoUrl: input.logoUrl ?? undefined,
      logoInitials,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  return organization;
}
