import { redirect } from "next/navigation";

export default function OrganizationsRedirectPage() {
  redirect("/dashboard/businesses");
}
