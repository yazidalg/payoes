import type React from "react";
import { auth } from "@/auth";
import { findUserByEmail } from "@/lib/auth/users";
import { userHasOrganization } from "@/lib/organizations/service";
import {
  getPrimaryOrganizationForUser,
  organizationHasReceivingWallet,
} from "@/lib/organizations/wallet";
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

export default async function WalletOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user ? await resolveUserId(session) : null;

  if (!userId) {
    redirect("/login?error=SessionExpired");
  }

  const hasOrganization = await userHasOrganization(userId);

  if (!hasOrganization) {
    redirect("/onboarding/organization");
  }

  const organization = await getPrimaryOrganizationForUser(userId);

  if (
    organization &&
    (await organizationHasReceivingWallet(
      organization.id,
      organization.environment
    ))
  ) {
    redirect("/dashboard/payments");
  }

  return children;
}
