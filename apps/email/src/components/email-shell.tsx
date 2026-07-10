import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components";
import type { ReactNode } from "react";
import { DEFAULT_PAYOES_WORDMARK } from "../constants";
import { Footer } from "./footer";

export function EmailShell({
  preview,
  email,
  wordmarkUrl = DEFAULT_PAYOES_WORDMARK,
  children,
}: {
  preview: string;
  email: string;
  wordmarkUrl?: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={wordmarkUrl} height="32" alt="Payoes" />
            </Section>
            {children}
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
