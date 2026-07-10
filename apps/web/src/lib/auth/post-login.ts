import { getPendingInviteTokenForEmail } from "@/lib/organizations/members";
import { userHasOrganization } from "@/lib/organizations/service";
import { getSafePostAuthRedirect } from "@/lib/auth/safe-redirect";

export { getSafePostAuthRedirect } from "@/lib/auth/safe-redirect";

export async function resolvePostAuthRedirect(
  userId: string,
  userEmail: string,
  callbackUrl?: string | null,
): Promise<string> {
  const safeCallback = getSafePostAuthRedirect(callbackUrl);

  if (safeCallback) {
    return safeCallback;
  }

  const pendingInviteToken = await getPendingInviteTokenForEmail(userEmail);

  if (pendingInviteToken) {
    return `/invite/${pendingInviteToken}`;
  }

  const hasOrganization = await userHasOrganization(userId);

  return hasOrganization ? "/dashboard/payments" : "/onboarding";
}
