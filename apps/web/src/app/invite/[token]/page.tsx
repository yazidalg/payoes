import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { InviteAcceptPanel } from "@/components/settings/invite-accept-panel";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <OnboardingLayout>
      <InviteAcceptPanel token={token} />
    </OnboardingLayout>
  );
}
