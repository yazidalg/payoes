export const DEFAULT_APP_URL = "http://localhost:3000";

export const DEFAULT_DOCS_URL = "http://localhost:3001";

export const DEFAULT_GITHUB_REPO_URL = "https://github.com/yazidalg/payoes";

export const DEFAULT_SMTP_PORT = 587;

export const MOBILE_BREAKPOINT_PX = 768;

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (url) {
    return url.replace(/\/$/, "");
  }

  return DEFAULT_APP_URL;
}
