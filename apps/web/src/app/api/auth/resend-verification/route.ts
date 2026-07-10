import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
} from "@/constants/auth";
import { getSafePostAuthRedirect } from "@/lib/auth/safe-redirect";
import { findUserByEmail, resendEmailVerification } from "@/lib/auth/users";

const resendSchema = z.object({
  email: z.string().email("Invalid email"),
  callbackUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const callbackUrl = getSafePostAuthRedirect(parsed.data.callbackUrl);
    const user = await findUserByEmail(parsed.data.email);

    if (!user) {
      return NextResponse.json({ sent: true });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ sent: true, alreadyVerified: true });
    }

    await resendEmailVerification(user.id, callbackUrl);

    return NextResponse.json({ sent: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "RESEND_COOLDOWN") {
        return NextResponse.json(
          {
            error: AUTH_ERROR_MESSAGES.RESEND_COOLDOWN,
            code: AUTH_ERROR_CODES.RESEND_COOLDOWN,
          },
          { status: 429 }
        );
      }

      if (error.message === "GOOGLE_ACCOUNT") {
        return NextResponse.json(
          {
            error: AUTH_ERROR_MESSAGES.GOOGLE_ACCOUNT,
            code: AUTH_ERROR_CODES.GOOGLE_ACCOUNT,
          },
          { status: 400 }
        );
      }

      if (error.message === "EMAIL_DELIVERY_FAILED") {
        return NextResponse.json(
          {
            error:
              "Unable to send the verification email. Check SMTP settings and try again.",
          },
          { status: 503 }
        );
      }
    }

    console.error("Resend verification failed:", error);
    return NextResponse.json(
      { error: "Unable to resend verification email" },
      { status: 500 }
    );
  }
}
