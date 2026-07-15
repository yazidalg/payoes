import { ProfileSettingsPanel } from "@/components/settings/profile-settings-panel";
import { getDashboardUserId } from "@/lib/dashboard/get-organization";
import { getUserProfile } from "@/lib/users/service";
import { redirect } from "next/navigation";

export default async function ProfileSettingsPage() {
  const userId = await getDashboardUserId();
  const user = await getUserProfile(userId);

  if (!user) {
    redirect("/login");
  }

  return <ProfileSettingsPanel user={user} />;
}
