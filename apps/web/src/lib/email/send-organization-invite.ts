import { getAppUrl } from "@/constants/app";
import { sendEmail } from "@payoes/email";
import OrganizationInvite from "@payoes/email/templates/organization-invite";

function getWordmarkUrl() {
  return `${getAppUrl().replace(/\/$/, "")}/logo-full.png`;
}

export async function sendOrganizationInviteEmail(input: {
  to: string;
  organizationName: string;
  role: "admin" | "member";
  inviterName: string;
  inviterEmail?: string | null;
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

  return sendEmail({
    to: input.to,
    subject: `You've been invited to join ${input.organizationName} on Payoes`,
    react: OrganizationInvite({
      email: input.to,
      url: inviteUrl,
      organizationName: input.organizationName,
      roleLabel,
      inviterName: input.inviterName,
      inviterEmail: input.inviterEmail,
      expiresLabel,
      wordmarkUrl: getWordmarkUrl(),
    }),
  });
}
