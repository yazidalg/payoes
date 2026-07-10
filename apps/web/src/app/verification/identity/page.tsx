import { auth } from "@/auth";
import { IdentityVerificationForm } from "@/components/kyc/identity-verification-form";
import { getActiveOrganizationForUser } from "@/lib/organizations/active-organization";
import { getMembershipForUser } from "@/lib/organizations/members";
import { redirect } from "next/navigation";

export default async function VerificationIdentityPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const organization = await getActiveOrganizationForUser(session.user.id);

  if (!organization) {
    redirect("/onboarding");
  }

  const membership = await getMembershipForUser(organization.id, session.user.id);
  const isOwner = membership?.role === "owner";

  return (
    <IdentityVerificationForm
      organizationId={organization.id}
      isOwner={isOwner}
    />
  );
}
