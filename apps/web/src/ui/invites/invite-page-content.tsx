import { getGoSession } from "@/lib/auth/get-go-session";
import {
  getInvitePageData,
  getUserOrganizationCount,
} from "@/lib/organizations/members";
import { CloseInviteButton } from "@/ui/invites/close-invite-button";
import { InviteConfetti } from "@/ui/invites/invite-confetti";
import { InviteHero } from "@/ui/invites/invite-hero";
import {
  InviteProductsSection,
  InviteResourcesSection,
  InviteTeamSection,
} from "@/ui/invites/invite-sections";
import { EmptyState } from "@dub/ui";
import { LinkBroken } from "@dub/ui/icons";
import { redirect } from "next/navigation";

export async function InvitePageContent({ token }: { token: string }) {
  const session = await getGoSession();

  if (!session?.user?.id || !session.user.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const data = await getInvitePageData(token);

  if (!data) {
    return (
      <div className="flex grow flex-col items-center justify-center px-4 py-10">
        <EmptyState
          icon={LinkBroken}
          title="Invalid Invite Link"
          description="The invite link you are trying to use is invalid. Please contact the business owner for more information."
        />
      </div>
    );
  }

  const userOrganizationCount = await getUserOrganizationCount(session.user.id);
  const goToOnboarding = userOrganizationCount === 0;

  const user = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email,
    image: session.user.image ?? null,
  };

  const isUnavailable = data.invite.status !== "pending";
  const emailMismatch =
    !isUnavailable &&
    data.invite.email.toLowerCase() !== session.user.email.toLowerCase();

  if (isUnavailable || emailMismatch) {
    return (
      <>
        <div className="z-10 flex items-center justify-end p-4">
          <CloseInviteButton goToOnboarding={goToOnboarding} />
        </div>
        <div className="-mt-16 flex grow flex-col items-center justify-center px-4 py-10">
          <InviteHero
            organization={data.organization}
            user={user}
            role={data.invite.role}
            isExpired={isUnavailable}
            inviteStatus={
              data.invite.status === "pending"
                ? undefined
                : data.invite.status
            }
            emailMismatch={emailMismatch}
            invitedEmail={data.invite.email}
            token={token}
            goToOnboarding={goToOnboarding}
          />
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end p-4">
        <CloseInviteButton goToOnboarding={goToOnboarding} />
      </div>
      <div className="flex w-full flex-col items-center justify-center px-4 py-10">
        <InviteHero
          organization={data.organization}
          user={user}
          role={data.invite.role}
          isExpired={false}
          token={token}
          goToOnboarding={goToOnboarding}
        />
        <div className="flex w-full flex-col items-center">
          <InviteProductsSection organizationName={data.organization.name} />
          <InviteTeamSection teamMembers={data.teamMembers} />
          <InviteResourcesSection />
        </div>
      </div>
      <InviteConfetti />
    </div>
  );
}
