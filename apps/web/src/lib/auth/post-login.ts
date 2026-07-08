import { userHasOrganization } from "@/lib/organizations/service";

export async function getPostLoginPath(userId: string) {
  const hasOrganization = await userHasOrganization(userId);

  return hasOrganization ? "/dashboard" : "/onboarding";
}
