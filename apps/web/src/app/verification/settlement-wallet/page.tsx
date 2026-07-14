import { auth } from "@/auth";
import { SettlementWalletStep } from "@/components/kyc/settlement-wallet-step";
import { getVerificationSummary } from "@/lib/kyc/service";
import { getActiveOrganizationForUser } from "@/lib/organizations/active-organization";
import { getMembershipForUser } from "@/lib/organizations/members";
import { getSettlementWallet } from "@/lib/organizations/settlement-wallet";
import { redirect } from "next/navigation";

export default async function VerificationSettlementWalletPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const organization = await getActiveOrganizationForUser(session.user.id);

  if (!organization) {
    redirect("/onboarding");
  }

  const productionWallet = await getSettlementWallet(
    organization.id,
    "production",
  );

  if (
    productionWallet &&
    organization.environment === "production"
  ) {
    redirect("/dashboard/payments");
  }

  const summary = await getVerificationSummary(organization.id);
  const identityComplete =
    summary.organization.verificationStatus === "verified" &&
    !summary.isExpired;

  if (!identityComplete) {
    redirect("/verification/identity");
  }

  const membership = await getMembershipForUser(organization.id, session.user.id);
  const isOwner = membership?.role === "owner";

  return (
    <SettlementWalletStep organizationId={organization.id} isOwner={isOwner} />
  );
}
