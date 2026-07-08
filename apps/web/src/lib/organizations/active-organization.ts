import { cookies } from "next/headers";
import { getMembershipForUser } from "@/lib/organizations/members";
import { getPrimaryOrganizationForUser } from "@/lib/organizations/wallet";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const ACTIVE_ORGANIZATION_COOKIE = "payoes_active_org";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function getActiveOrganizationIdFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value ?? null;
}

export async function setActiveOrganizationCookie(organizationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearActiveOrganizationCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORGANIZATION_COOKIE);
}

export async function getActiveOrganizationForUser(userId: string) {
  const cookieOrganizationId = await getActiveOrganizationIdFromCookie();

  if (cookieOrganizationId) {
    const membership = await getMembershipForUser(
      cookieOrganizationId,
      userId
    );

    if (membership) {
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, cookieOrganizationId))
        .limit(1);

      if (organization) {
        return organization;
      }
    }
  }

  return getPrimaryOrganizationForUser(userId);
}
