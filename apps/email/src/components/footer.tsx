import { Hr, Link, Tailwind, Text } from "@react-email/components";
import { PAYOES_SUPPORT_URL } from "../constants";

export function Footer({ email }: { email: string }) {
  return (
    <Tailwind>
      <Hr className="mx-0 my-6 w-full border border-neutral-200" />
      <Text className="text-[12px] leading-6 text-neutral-500">
        This email was intended for <span className="text-black">{email}</span>.
        If you were not expecting this email, you can ignore it. If you are
        concerned about your account safety, please{" "}
        <Link className="text-neutral-700 underline" href={PAYOES_SUPPORT_URL}>
          contact support
        </Link>
        .
      </Text>
      <Text className="text-[12px] text-neutral-500">Payoes</Text>
    </Tailwind>
  );
}
