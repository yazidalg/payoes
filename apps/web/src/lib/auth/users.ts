import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

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
}) {
  const existing = await findUserByEmail(input.email);

  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      name: input.name.trim(),
      passwordHash,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  return user;
}

export async function verifyUserPassword(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user?.passwordHash) {
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
    const [updated] = await db
      .update(users)
      .set({
        name: input.name?.trim() || existing.name,
        image: input.image ?? existing.image,
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
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
    });

  return created;
}

export async function ensureDemoUser() {
  const demoEmail = process.env.AUTH_DEMO_EMAIL;
  const demoPassword = process.env.AUTH_DEMO_PASSWORD;

  if (!demoEmail || !demoPassword) {
    return null;
  }

  const existing = await findUserByEmail(demoEmail);

  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const [user] = await db
    .insert(users)
    .values({
      email: demoEmail.toLowerCase(),
      name: "Payoes User",
      passwordHash,
    })
    .returning();

  return user;
}

export async function verifyDemoUserPassword(email: string, password: string) {
  const demoEmail = process.env.AUTH_DEMO_EMAIL;
  const demoPassword = process.env.AUTH_DEMO_PASSWORD;

  if (!demoEmail || !demoPassword) {
    return null;
  }

  if (email.toLowerCase() !== demoEmail.toLowerCase() || password !== demoPassword) {
    return null;
  }

  const user = await ensureDemoUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}
