import { findUserByEmail } from "@/lib/auth/users";

export async function resolveSessionUserId(session: {
  user?: { id?: string; email?: string | null };
} | null) {
  if (!session?.user) {
    return null;
  }

  if (session.user.id) {
    return session.user.id;
  }

  if (!session.user.email) {
    return null;
  }

  const user = await findUserByEmail(session.user.email);
  return user?.id ?? null;
}
