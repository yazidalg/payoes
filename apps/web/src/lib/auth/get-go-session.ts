import { cookies } from "next/headers";
import {
  GO_SESSION_COOKIE,
  verifyGoSessionToken,
  type GoSessionUser,
} from "@/lib/auth/go-session";

/** Server-side Go JWT session (replaces NextAuth auth() for layouts/pages). */
export async function getGoSession(): Promise<{ user: GoSessionUser } | null> {
  const token = (await cookies()).get(GO_SESSION_COOKIE)?.value;
  const user = await verifyGoSessionToken(token);
  if (!user) {
    return null;
  }
  return { user };
}
