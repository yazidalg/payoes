import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailShell } from "../components/email-shell";

export default function OrganizationInvite({
  email = "teammate@company.com",
  url = "http://localhost:3000/invite/example-token",
  organizationName = "Acme Payments",
  roleLabel = "Member",
  inviterName = "Alex Johnson",
  inviterEmail = "alex@company.com",
  expiresLabel = "July 24, 2026",
  wordmarkUrl,
}: {
  email: string;
  url: string;
  organizationName: string;
  roleLabel: string;
  inviterName?: string | null;
  inviterEmail?: string | null;
  expiresLabel: string;
  wordmarkUrl?: string;
}) {
  return (
    <EmailShell
      preview={`Join ${organizationName} on Payoes`}
      email={email}
      wordmarkUrl={wordmarkUrl}
    >
      <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
        Join {organizationName} on Payoes
      </Heading>
      {inviterName && inviterEmail ? (
        <Text className="text-sm leading-6 text-black">
          <strong>{inviterName}</strong> (
          <Link
            className="text-blue-600 no-underline"
            href={`mailto:${inviterEmail}`}
          >
            {inviterEmail}
          </Link>
          ) invited you to join <strong>{organizationName}</strong> on Payoes
          as <strong>{roleLabel}</strong>.
        </Text>
      ) : (
        <Text className="text-sm leading-6 text-black">
          You have been invited to join <strong>{organizationName}</strong> on
          Payoes as <strong>{roleLabel}</strong>.
        </Text>
      )}
      <Section className="mb-8 mt-8">
        <Link
          className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={url}
        >
          Accept invitation
        </Link>
      </Section>
      <Text className="text-sm leading-6 text-black">
        or copy and paste this URL into your browser:
      </Text>
      <Text className="max-w-sm flex-wrap break-words font-medium text-purple-600 no-underline">
        {url.replace(/^https?:\/\//, "")}
      </Text>
      <Text className="text-sm leading-6 text-black">
        This invitation expires on {expiresLabel}.
      </Text>
    </EmailShell>
  );
}
