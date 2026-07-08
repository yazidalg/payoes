import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { DEFAULT_SMTP_PORT } from "@/constants/app";

function readEnvValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.trim().replace(/^["']|["']$/g, "");
}

export function isSmtpConfigured() {
  return Boolean(
    readEnvValue(process.env.SMTP_HOST) && readEnvValue(process.env.SMTP_FROM)
  );
}

function createTransporter() {
  const host = readEnvValue(process.env.SMTP_HOST);
  const port = Number(readEnvValue(process.env.SMTP_PORT) ?? String(DEFAULT_SMTP_PORT));
  const user = readEnvValue(process.env.SMTP_USER);
  const pass = readEnvValue(process.env.SMTP_PASSWORD);

  if (!host) {
    return null;
  }

  const options: SMTPTransport.Options = {
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  };

  if (port === 587) {
    options.requireTLS = true;
  }

  return nodemailer.createTransport(options);
}

export type SendEmailResult = {
  delivered: boolean;
  logged: boolean;
};

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendEmailResult> {
  const transporter = createTransporter();
  const from = readEnvValue(process.env.SMTP_FROM);

  if (!transporter || !from) {
    console.info("[email] SMTP not configured. Email not sent.");
    console.info(`[email] To: ${input.to}`);
    console.info(`[email] Subject: ${input.subject}`);
    console.info(`[email] Body:\n${input.text}`);
    return { delivered: false, logged: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    console.info(
      `[email] Sent to ${input.to} (messageId: ${info.messageId ?? "unknown"})`
    );

    return { delivered: true, logged: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown SMTP delivery error";

    console.error(`[email] Failed to send to ${input.to}: ${message}`);
    throw new Error(`Unable to send email: ${message}`);
  }
}
