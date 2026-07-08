import { auth } from "@/auth";
import { CreateOrganizationScreen } from "@/components/onboarding/create-organization-screen";
import { findUserByEmail } from "@/lib/auth/users";
import { userHasOrganization } from "@/lib/organizations/service";
import { redirect } from "next/navigation";

async function resolveUserId(session: {
  user?: { id?: string; email?: string | null };
}) {
  if (session.user?.id) {
    return session.user.id;
  }

  if (!session.user?.email) {
    return null;
  }

  const user = await findUserByEmail(session.user.email);
  return user?.id ?? null;
}

export default async function NewOrganizationPage() {
  const session = await auth();
  const userId = session?.user ? await resolveUserId(session) : null;

  if (!userId) {
    redirect("/login");
  }

  const hasOrganization = await userHasOrganization(userId);

  if (!hasOrganization) {
    redirect("/onboarding");
  }

  return (
    <CreateOrganizationScreen
      defaultEmail={session?.user?.email}
      backHref="/dashboard/payments"
      backLabel="Back to dashboard"
    />
  );
}
