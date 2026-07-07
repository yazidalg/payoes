import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

async function ensureUsersFile() {
  await mkdir(path.dirname(USERS_FILE), { recursive: true });

  try {
    await readFile(USERS_FILE, "utf8");
  } catch {
    await writeFile(USERS_FILE, "[]", "utf8");
  }
}

async function readUsers(): Promise<StoredUser[]> {
  await ensureUsersFile();
  const raw = await readFile(USERS_FILE, "utf8");
  return JSON.parse(raw) as StoredUser[];
}

async function writeUsers(users: StoredUser[]) {
  await ensureUsersFile();
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserByEmail(email: string) {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
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
  const user: StoredUser = {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    name: input.name.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  const users = await readUsers();
  users.push(user);
  await writeUsers(users);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export async function verifyUserPassword(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user) {
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
  };
}
