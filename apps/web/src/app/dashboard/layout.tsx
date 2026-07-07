import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { findUserByEmail } from "@/lib/auth/users";
import {
  getOrganizationsForUser,
  userHasOrganization,
} from "@/lib/organizations/service";
import {
  organizationHasReceivingWallet,
} from "@/lib/organizations/wallet";
import { headers } from "next/headers";
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
  const primaryOrganization = organizations[0];

  if (primaryOrganization) {
    const hasWallet = await organizationHasReceivingWallet(
      primaryOrganization.id,
      primaryOrganization.environment
    );

    if (!hasWallet) {
      const headersList = await headers();
      const pathname = headersList.get("x-pathname") ?? "";

      if (pathname !== "/dashboard/settings/receiving-wallet") {
        redirect("/onboarding/wallet");
      }
    }
  }

  return (
    <DashboardShell user={session.user} organizations={organizations}>
      {children}
    </DashboardShell>
  );
}
