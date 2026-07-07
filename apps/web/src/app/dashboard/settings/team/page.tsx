import { auth } from "@/auth";
import { findUserByEmail } from "@/lib/auth/users";
import { TeamMembersPanel } from "@/components/settings/team-members-panel";
import { getMembershipForUser } from "@/lib/organizations/members";
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

export default async function TeamMembersPage() {
  const session = await auth();
  const userId = session?.user ? await resolveUserId(session) : null;

  if (!userId) {
    redirect("/login");
  }

  const organization = await getPrimaryOrganizationForUser(userId);

  if (!organization) {
    redirect("/onboarding");
  }

  const membership = await getMembershipForUser(organization.id, userId);

  if (!membership) {
    redirect("/onboarding");
  }

  return (
    <TeamMembersPanel
      organizationId={organization.id}
      viewerRole={membership.role}
      viewerUserId={userId}
    />
  );
}
