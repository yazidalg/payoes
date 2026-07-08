import nodemailer from "nodemailer";
import { DEFAULT_SMTP_PORT } from "@/constants/app";

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? DEFAULT_SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM;

  if (!transporter || !from) {
    console.info("[email] SMTP not configured. Email not sent.");
    console.info(`[email] To: ${input.to}`);
    console.info(`[email] Subject: ${input.subject}`);
    console.info(`[email] Body:\n${input.text}`);
    return { delivered: false, logged: true };
  }

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { delivered: true, logged: false };
}
