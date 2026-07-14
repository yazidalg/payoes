import { auth } from "@/auth";
import { CreateBusinessScreen } from "@/components/onboarding/create-business-screen";
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
    <CreateBusinessScreen
      defaultEmail={session?.user?.email}
      showCloseButton
      closeHref="/dashboard/payments"
    />
  );
}
