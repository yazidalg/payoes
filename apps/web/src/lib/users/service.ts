import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";

export type UserProfile = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "image"
  | "authProvider"
  | "emailVerifiedAt"
  | "createdAt"
  | "updatedAt"
>;

export async function getUserProfile(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
      image: true,
      authProvider: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user ?? null;
}

export async function updateUserProfile(
  userId: string,
  input: {
    name?: string;
    image?: string | null;
  },
) {
  const [user] = await db
    .update(users)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      authProvider: users.authProvider,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  return user ?? null;
}
