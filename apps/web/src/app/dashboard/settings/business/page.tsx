import { BusinessSettingsPanel } from "@/components/settings/business-settings-panel";
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
    <BusinessSettingsPanel
      organization={organization}
      viewerRole={membership.role}
    />
  );
}
