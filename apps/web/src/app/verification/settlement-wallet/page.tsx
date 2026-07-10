import { auth } from "@/auth";
import { SettlementWalletStep } from "@/components/kyc/settlement-wallet-step";
import { getActiveOrganizationForUser } from "@/lib/organizations/active-organization";
import { getMembershipForUser } from "@/lib/organizations/members";
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

  if (organization.environment !== "production") {
    redirect("/verification/go-live");
  }

  const membership = await getMembershipForUser(organization.id, session.user.id);
  const isOwner = membership?.role === "owner";

  return (
    <SettlementWalletStep organizationId={organization.id} isOwner={isOwner} />
  );
}
