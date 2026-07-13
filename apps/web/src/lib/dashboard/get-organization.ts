import { getGoSession } from "@/lib/auth/get-go-session";
import { findUserByEmail } from "@/lib/auth/users";
import { getActiveOrganizationForUser } from "@/lib/organizations/active-organization";
import { redirect } from "next/navigation";

async function resolveUserId(session: {
  user?: { id?: string; email?: string | null };
}) {
  if (session.user?.id) {
    return session.user.id;
  }

  if (!session.user?.email) {
    return null;
  }

  const user = await findUserByEmail(session.user.email);
  return user?.id ?? null;
}

export async function getDashboardUserId() {
  const session = await getGoSession();
  const userId = session?.user ? await resolveUserId(session) : null;

  if (!userId) {
    redirect("/login");
  }

  return userId;
}

export async function getDashboardOrganization() {
  const userId = await getDashboardUserId();

  const organization = await getActiveOrganizationForUser(userId);

  if (!organization) {
    redirect("/onboarding");
  }

  return organization;
}
