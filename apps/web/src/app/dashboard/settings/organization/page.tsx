import { OrganizationSettingsPanel } from "@/components/settings/organization-settings-panel";
import {
  getDashboardOrganization,
  getDashboardUserId,
} from "@/lib/dashboard/get-organization";
import { getMembershipForUser } from "@/lib/organizations/members";
import { redirect } from "next/navigation";

export default async function OrganizationPage() {
  const [organization, userId] = await Promise.all([
    getDashboardOrganization(),
    getDashboardUserId(),
  ]);

  const membership = await getMembershipForUser(organization.id, userId);

  if (!membership) {
    redirect("/onboarding");
  }

  return (
    <OrganizationSettingsPanel
      organization={organization}
      viewerRole={membership.role}
    />
  );
}
