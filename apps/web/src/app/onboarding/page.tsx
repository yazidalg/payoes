import { auth } from "@/auth";
import { CreateBusinessScreen } from "@/components/onboarding/create-business-screen";

export default async function OnboardingPage() {
  const session = await auth();

  return (
    <CreateBusinessScreen defaultEmail={session?.user?.email} />
  );
}
