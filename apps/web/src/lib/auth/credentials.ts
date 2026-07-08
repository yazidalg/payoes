import bcrypt from "bcryptjs";
import { AUTH_ERROR_CODES, type AuthErrorCode } from "@/constants/auth";
import { findUserByEmail } from "@/lib/auth/users";

export type CredentialLoginResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        name: string;
        image: string | null;
      };
    }
  | {
      ok: false;
      code: AuthErrorCode;
    };

export function isGoogleOnlyAccount(user: {
  authProvider: "credentials" | "google";
  passwordHash: string | null;
}) {
  return user.authProvider === "google" || !user.passwordHash;
}

export function isCredentialsAccount(user: {
  authProvider: "credentials" | "google";
  passwordHash: string | null;
}) {
  return user.authProvider === "credentials" && Boolean(user.passwordHash);
}

export async function validateCredentialLogin(
  email: string,
  password: string
): Promise<CredentialLoginResult> {
  const user = await findUserByEmail(email);

  if (!user) {
    return { ok: false, code: AUTH_ERROR_CODES.INVALID_CREDENTIALS };
  }

  if (isGoogleOnlyAccount(user)) {
    return { ok: false, code: AUTH_ERROR_CODES.GOOGLE_ACCOUNT };
  }

  if (!user.emailVerifiedAt) {
    return { ok: false, code: AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED };
  }

  if (!user.passwordHash) {
    return { ok: false, code: AUTH_ERROR_CODES.GOOGLE_ACCOUNT };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    return { ok: false, code: AUTH_ERROR_CODES.INVALID_CREDENTIALS };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  };
}
