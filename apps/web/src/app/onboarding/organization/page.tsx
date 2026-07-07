import { auth } from "@/auth";
import { CreateOrganizationForm } from "@/components/onboarding/create-organization-form";

export default async function OnboardingOrganizationPage() {
  const session = await auth();

  return <CreateOrganizationForm defaultEmail={session?.user?.email} />;
}
