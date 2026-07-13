import type React from "react";
import { getGoSession } from "@/lib/auth/get-go-session";
import { findUserByEmail, findUserById } from "@/lib/auth/users";
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

export default async function OrganizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getGoSession();

  if (!session?.user) {
    redirect("/login?callbackUrl=/business/new");
  }

  const userId = await resolveUserId(session);

  if (!userId) {
    redirect("/login?error=SessionExpired");
  }

  const user = await findUserById(userId);

  if (
    user &&
    user.authProvider === "credentials" &&
    !user.emailVerifiedAt
  ) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}&pending=1`);
  }

  return children;
}
