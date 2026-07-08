import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
} from "@/constants/auth";
import { validateCredentialLogin } from "@/lib/auth/credentials";
import { getPostLoginPath } from "@/lib/auth/post-login";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const result = await validateCredentialLogin(
    parsed.data.email,
    parsed.data.password
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        error: AUTH_ERROR_MESSAGES[result.code],
        code: result.code,
      },
      { status: 401 }
    );
  }

  const redirectTo = await getPostLoginPath(result.user.id);

  return NextResponse.json({ ok: true, redirectTo });
}
