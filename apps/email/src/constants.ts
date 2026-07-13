const webUrl = (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const DEFAULT_PAYOES_WORDMARK = `${webUrl}/logo-full.png`;

export const PAYOES_SUPPORT_URL =
  process.env.PAYOES_SUPPORT_URL ?? "https://payoes.com";
