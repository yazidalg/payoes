import { getGoSession } from "@/lib/auth/get-go-session";
import { CreateBusinessScreen } from "@/components/onboarding/create-business-screen";

export default async function OnboardingPage() {
  const session = await getGoSession();

  return (
    <CreateBusinessScreen defaultEmail={session?.user?.email} />
  );
}
