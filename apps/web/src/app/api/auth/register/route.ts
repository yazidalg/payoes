import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
} from "@/constants/auth";
import { createUser } from "@/lib/auth/users";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const user = await createUser(parsed.data);

    return NextResponse.json(
      {
        user,
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMAIL_EXISTS") {
        return NextResponse.json(
          {
            error: AUTH_ERROR_MESSAGES.EMAIL_EXISTS,
            code: AUTH_ERROR_CODES.EMAIL_EXISTS,
          },
          { status: 409 }
        );
      }

      if (error.message === "GOOGLE_ACCOUNT_EXISTS") {
        return NextResponse.json(
          {
            error: AUTH_ERROR_MESSAGES.GOOGLE_ACCOUNT,
            code: AUTH_ERROR_CODES.GOOGLE_ACCOUNT,
          },
          { status: 409 }
        );
      }
    }

    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Unable to create account" },
      { status: 500 }
    );
  }
}
