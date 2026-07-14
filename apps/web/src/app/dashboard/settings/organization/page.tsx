import { redirect } from "next/navigation";

export default function OrganizationSettingsRedirectPage() {
  redirect("/dashboard/settings/business");
}
