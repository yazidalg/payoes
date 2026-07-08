import { auth } from "@/auth";
import { CreateOrganizationScreen } from "@/components/onboarding/create-organization-screen";

export default async function OnboardingOrganizationPage() {
  const session = await auth();

  return (
    <CreateOrganizationScreen
      defaultEmail={session?.user?.email}
      backHref="/onboarding"
      showStepIndicator
    />
  );
}
