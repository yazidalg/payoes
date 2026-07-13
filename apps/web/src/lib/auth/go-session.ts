import { jwtVerify } from "jose";

export const GO_SESSION_COOKIE = "payoes_session";

export type GoSessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

/** Verify the Go API JWT session cookie (shared AUTH_SECRET). */
export async function verifyGoSessionToken(
  token: string | undefined | null,
): Promise<GoSessionUser | null> {
  if (!token) {
    return null;
  }

  const secret = getSecret();
  if (!secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      image: typeof payload.image === "string" ? payload.image : null,
    };
  } catch {
    return null;
  }
}
