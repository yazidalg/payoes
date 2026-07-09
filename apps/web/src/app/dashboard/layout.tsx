import { auth } from "@/auth";
import { findUserByEmail } from "@/lib/auth/users";
import {
  getOrganizationsForUser,
  userHasOrganization,
} from "@/lib/organizations/service";
import { getActiveOrganizationForUser } from "@/lib/organizations/active-organization";
import { DashboardChrome } from "@/ui/layout/dashboard-chrome";
import { DashboardMainNav } from "@/ui/layout/dashboard-main-nav";
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = await resolveUserId(session);

  if (!userId) {
    redirect("/login?error=SessionExpired");
  }

  const hasOrganization = await userHasOrganization(userId);

  if (!hasOrganization) {
    redirect("/onboarding");
  }

  const organizations = await getOrganizationsForUser(userId);
  const activeOrganization = await getActiveOrganizationForUser(userId);

  if (!activeOrganization) {
    redirect("/onboarding");
  }

  return (
    <DashboardMainNav
      user={session.user}
      organizations={organizations}
      initialActiveOrganization={activeOrganization}
    >
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardMainNav>
  );
}
