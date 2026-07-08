import { DEFAULT_AUTH_URL } from "@/constants/app";
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS } from "@/constants/auth";
import { sendEmail } from "@/lib/email/client";

function getAppUrl() {
  return process.env.AUTH_URL ?? DEFAULT_AUTH_URL;
}

export async function sendEmailVerificationLink(input: {
  to: string;
  name: string;
  token: string;
}) {
  const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(input.token)}`;
  const subject = "Verify your Payoes email";

  const text = [
    `Hi ${input.name},`,
    "",
    "Thanks for signing up for Payoes.",
    "",
    "Verify your email to continue setting up your organization:",
    verifyUrl,
    "",
    `This link expires in ${EMAIL_VERIFICATION_TOKEN_TTL_HOURS} hours.`,
    "",
    "If you did not create a Payoes account, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>Hi ${input.name},</p>
    <p>Thanks for signing up for Payoes. Verify your email to continue setting up your organization.</p>
    <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Verify email</a></p>
    <p style="color:#666;font-size:14px;">Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
    <p style="color:#666;font-size:14px;">This link expires in ${EMAIL_VERIFICATION_TOKEN_TTL_HOURS} hours.</p>
    <p style="color:#666;font-size:14px;">If you did not create a Payoes account, you can ignore this email.</p>
  `.trim();

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
  });
}
