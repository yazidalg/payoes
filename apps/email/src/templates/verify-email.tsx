import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailShell } from "../components/email-shell";

export default function VerifyEmail({
  email = "teammate@company.com",
  name = "Alex",
  url = "http://localhost:3000/api/auth/verify-email?token=example-token",
  expiresInHours = 24,
  wordmarkUrl,
}: {
  email: string;
  name: string;
  url: string;
  expiresInHours?: number;
  wordmarkUrl?: string;
}) {
  return (
    <EmailShell
      preview="Verify your Payoes email"
      email={email}
      wordmarkUrl={wordmarkUrl}
    >
      <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
        Verify your email address
      </Heading>
      <Text className="text-sm leading-6 text-black">Hi {name},</Text>
      <Text className="text-sm leading-6 text-black">
        Thanks for signing up for Payoes. Click the button below to verify your
        email and continue setting up your organization.
      </Text>
      <Section className="mb-8 mt-8">
        <Link
          className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={url}
        >
          Verify email
        </Link>
      </Section>
      <Text className="text-sm leading-6 text-black">
        or copy and paste this URL into your browser:
      </Text>
      <Text className="max-w-sm flex-wrap break-words font-medium text-purple-600 no-underline">
        {url.replace(/^https?:\/\//, "")}
      </Text>
      <Text className="text-sm leading-6 text-black">
        This link expires in {expiresInHours} hours.
      </Text>
    </EmailShell>
  );
}
