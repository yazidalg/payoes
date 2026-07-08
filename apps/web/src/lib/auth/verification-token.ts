import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import {
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
} from "@/constants/auth";
import { db } from "@/lib/db";
import { emailVerificationOtps, users } from "@/lib/db/schema";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getLoginTokenSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
}

export async function createEmailVerificationLink(userId: string) {
  const now = new Date();

  const [latestToken] = await db
    .select({ createdAt: emailVerificationOtps.createdAt })
    .from(emailVerificationOtps)
    .where(
      and(
        eq(emailVerificationOtps.userId, userId),
        isNull(emailVerificationOtps.consumedAt)
      )
    )
    .orderBy(desc(emailVerificationOtps.createdAt))
    .limit(1);

  if (latestToken) {
    const elapsedSeconds =
      (now.getTime() - latestToken.createdAt.getTime()) / 1000;

    if (elapsedSeconds < EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS) {
      throw new Error("RESEND_COOLDOWN");
    }
  }

  await db
    .update(emailVerificationOtps)
    .set({ consumedAt: now })
    .where(
      and(
        eq(emailVerificationOtps.userId, userId),
        isNull(emailVerificationOtps.consumedAt)
      )
    );

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    now.getTime() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  await db.insert(emailVerificationOtps).values({
    userId,
    codeHash: hashToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function consumeEmailVerificationToken(rawToken: string) {
  const now = new Date();
  const tokenHash = hashToken(rawToken);

  const [record] = await db
    .select({
      id: emailVerificationOtps.id,
      userId: emailVerificationOtps.userId,
    })
    .from(emailVerificationOtps)
    .where(
      and(
        eq(emailVerificationOtps.codeHash, tokenHash),
        isNull(emailVerificationOtps.consumedAt),
        gt(emailVerificationOtps.expiresAt, now)
      )
    )
    .limit(1);

  if (!record) {
    const [expiredRecord] = await db
      .select({ id: emailVerificationOtps.id })
      .from(emailVerificationOtps)
      .where(eq(emailVerificationOtps.codeHash, tokenHash))
      .limit(1);

    if (expiredRecord) {
      throw new Error("TOKEN_EXPIRED");
    }

    throw new Error("INVALID_TOKEN");
  }

  await db
    .update(emailVerificationOtps)
    .set({ consumedAt: now })
    .where(eq(emailVerificationOtps.id, record.id));

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, record.userId))
    .limit(1);

  return user ?? null;
}

export async function createPostVerifyLoginToken(userId: string) {
  return new SignJWT({ sub: userId, purpose: "email-verify-login" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getLoginTokenSecret());
}

export async function verifyPostVerifyLoginToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getLoginTokenSecret());

    if (payload.purpose !== "email-verify-login" || typeof payload.sub !== "string") {
      return null;
    }

    return payload.sub;
  } catch {
    return null;
  }
}
