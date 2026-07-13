import { getGoSession } from "@/lib/auth/get-go-session";
import { findUserByEmail, findUserById } from "@/lib/auth/users";
import { getVerificationSummary } from "@/lib/kyc/service";
import { getActiveOrganizationForUser } from "@/lib/organizations/active-organization";
import { getSettlementWallet } from "@/lib/organizations/settlement-wallet";
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

export default async function VerificationPage() {
  const session = await getGoSession();

  if (!session?.user) {
    redirect("/login?callbackUrl=/verification");
  }

  const userId = await resolveUserId(session);

  if (!userId) {
    redirect("/login?error=SessionExpired");
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

  if (walletComplete && organization.environment === "production") {
    redirect("/dashboard/payments");
  }

  const summary = await getVerificationSummary(organization.id);

  if (summary.canSwitchToProduction) {
    redirect("/verification/settlement-wallet");
  }

  redirect("/verification/identity");
}
