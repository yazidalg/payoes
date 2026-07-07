import { sendEmail } from "@/lib/email/client";

function getAppUrl() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export async function sendOrganizationInviteEmail(input: {
  to: string;
  organizationName: string;
  role: "admin" | "member";
  inviterName: string;
  token: string;
  expiresAt: Date;
}) {
  const inviteUrl = `${getAppUrl()}/invite/${input.token}`;
  const roleLabel = input.role === "admin" ? "Admin" : "Member";
  const expiresLabel = input.expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const subject = `You've been invited to join ${input.organizationName} on Payoes`;

  const text = [
    `${input.inviterName} invited you to join ${input.organizationName} on Payoes as ${roleLabel}.`,
    "",
    `Accept invitation: ${inviteUrl}`,
    "",
    `This link expires on ${expiresLabel}.`,
  ].join("\n");

  const html = `
    <p>${input.inviterName} invited you to join <strong>${input.organizationName}</strong> on Payoes as <strong>${roleLabel}</strong>.</p>
    <p><a href="${inviteUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Accept invitation</a></p>
    <p style="color:#666;font-size:14px;">Or copy this link: <a href="${inviteUrl}">${inviteUrl}</a></p>
    <p style="color:#666;font-size:14px;">This link expires on ${expiresLabel}.</p>
  `.trim();

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
  });
}
