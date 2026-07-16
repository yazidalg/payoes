import { DEFAULT_AUTH_URL } from "@/constants/app";
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS } from "@/constants/auth";
import { sendEmail } from "@payoes/email";
import VerifyEmail from "@payoes/email/templates/verify-email";

function getAppUrl() {
  return process.env.AUTH_URL ?? DEFAULT_AUTH_URL;
}

function getWordmarkUrl() {
  return `${getAppUrl().replace(/\/$/, "")}/logo-full.png`;
}

export async function sendEmailVerificationLink(input: {
  to: string;
  name: string;
  token: string;
  callbackUrl?: string | null;
}) {
  const verifyUrl = new URL(
    `${getAppUrl().replace(/\/$/, "")}/api/auth/verify-email`,
  );
  verifyUrl.searchParams.set("token", input.token);

  if (input.callbackUrl) {
    verifyUrl.searchParams.set("callbackUrl", input.callbackUrl);
  }

  return sendEmail({
    to: input.to,
    subject: "Verify your Payoes email",
    react: VerifyEmail({
      email: input.to,
      name: input.name,
      url: verifyUrl.toString(),
      expiresInHours: EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
      wordmarkUrl: getWordmarkUrl(),
    }),
  });
}
