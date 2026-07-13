import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createEmailVerificationLink } from "@/lib/auth/verification-token";
import { sendEmailVerificationLink } from "@/lib/email/send-verification-email";
import { isCredentialsAccount, isGoogleOnlyAccount } from "@/lib/auth/credentials";

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
}

export async function findUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  callbackUrl?: string | null;
}) {
  const existing = await findUserByEmail(input.email);

  if (existing) {
    if (isGoogleOnlyAccount(existing)) {
      throw new Error("GOOGLE_ACCOUNT_EXISTS");
    }

    throw new Error("EMAIL_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      name: input.name.trim(),
      passwordHash,
      authProvider: "credentials",
      emailVerifiedAt: null,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  const { token } = await createEmailVerificationLink(user.id);

  const delivery = await sendEmailVerificationLink({
    to: user.email,
    name: user.name,
    token,
    callbackUrl: input.callbackUrl,
  });

  if (!delivery.delivered) {
    console.warn(
      `[auth] Verification email for ${user.email} was not delivered via SMTP`
    );
  }

  return user;
}

export async function markEmailVerified(userId: string) {
  const [user] = await db
    .update(users)
    .set({
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  return user ?? null;
}

export async function resendEmailVerification(
  userId: string,
  callbackUrl?: string | null,
) {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.emailVerifiedAt) {
    throw new Error("ALREADY_VERIFIED");
  }

  if (isGoogleOnlyAccount(user)) {
    throw new Error("GOOGLE_ACCOUNT");
  }

  const { token } = await createEmailVerificationLink(userId);

  const delivery = await sendEmailVerificationLink({
    to: user.email,
    name: user.name,
    token,
    callbackUrl,
  });

  if (!delivery.delivered) {
    throw new Error("EMAIL_DELIVERY_FAILED");
  }

  return { email: user.email };
}

export async function verifyUserPassword(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user?.passwordHash || !user.emailVerifiedAt) {
    return null;
  }

  if (isGoogleOnlyAccount(user)) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}

export async function upsertOAuthUser(input: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const email = input.email.toLowerCase();
  const existing = await findUserByEmail(email);

  if (existing) {
    if (isCredentialsAccount(existing)) {
      throw new Error("CREDENTIALS_ACCOUNT_EXISTS");
    }

    const [updated] = await db
      .update(users)
      .set({
        name: input.name?.trim() || existing.name,
        image: input.image ?? existing.image,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
      });

    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: input.name?.trim() || email.split("@")[0],
      image: input.image ?? null,
      passwordHash: null,
      authProvider: "google",
      emailVerifiedAt: new Date(),
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
    });

  return created;
}
