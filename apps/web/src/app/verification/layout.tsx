import type React from "react";
import { auth } from "@/auth";
import { findUserByEmail, findUserById } from "@/lib/auth/users";
import { getVerificationSummary } from "@/lib/kyc/service";
import { getActiveOrganizationForUser } from "@/lib/organizations/active-organization";
import { getSettlementWallet } from "@/lib/organizations/settlement-wallet";
import { KycVerificationLayout } from "@/ui/kyc/kyc-verification-layout";
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

export default async function VerificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/verification");
  }

  const userId = await resolveUserId(session);

  if (!userId) {
    redirect("/login?error=SessionExpired");
  }

  const user = await findUserById(userId);

  if (
    user &&
    user.authProvider === "credentials" &&
    !user.emailVerifiedAt
  ) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}&pending=1`);
  }

  const organization = await getActiveOrganizationForUser(userId);

  if (!organization) {
    redirect("/onboarding");
  }

  const productionWallet = await getSettlementWallet(
    organization.id,
    "production",
  );
  const walletComplete = Boolean(productionWallet);
  const goLiveComplete = organization.environment === "production";

  if (goLiveComplete && walletComplete) {
    redirect("/dashboard/payments");
  }

  const summary = await getVerificationSummary(organization.id);
  const identityComplete =
    summary.organization.verificationStatus === "verified" && !summary.isExpired;

  return (
    <KycVerificationLayout
      identityComplete={identityComplete}
      goLiveComplete={goLiveComplete}
      walletComplete={walletComplete}
    >
      {children}
    </KycVerificationLayout>
  );
}
