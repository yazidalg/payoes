import { auth } from "@/auth";
import { findUserByEmail } from "@/lib/auth/users";
import { getPrimaryOrganizationForUser } from "@/lib/organizations/wallet";
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

export async function getDashboardOrganization() {
  const session = await auth();
  const userId = session?.user ? await resolveUserId(session) : null;

  if (!userId) {
    redirect("/login");
  }

  const organization = await getPrimaryOrganizationForUser(userId);

  if (!organization) {
    redirect("/onboarding");
  }

  return organization;
}
