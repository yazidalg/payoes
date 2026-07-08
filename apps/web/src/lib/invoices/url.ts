import { DEFAULT_AUTH_URL } from "@/constants/app";

function getAppUrl() {
  return process.env.AUTH_URL ?? DEFAULT_AUTH_URL;
}

export function getHostedInvoiceUrl(publicId: string) {
  return `${getAppUrl()}/i/${publicId}`;
}
