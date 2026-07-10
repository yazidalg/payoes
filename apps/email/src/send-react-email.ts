import "server-only";

import type { ReactElement } from "react";
import { renderEmail } from "./render";
import { sendEmail as sendEmailMessage } from "./send-email";

export type SendEmailOptions = {
  to: string;
  subject: string;
  react: ReactElement;
  text?: string;
};

export async function sendEmail(input: SendEmailOptions) {
  const rendered = await renderEmail(input.react);

  return sendEmailMessage({
    to: input.to,
    subject: input.subject,
    text: input.text ?? rendered.text,
    html: rendered.html,
  });
}
