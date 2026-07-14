import { DEFAULT_AUTH_URL } from "@/constants/app";

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

export function getPaymentLinkCheckoutPreviewUrl(origin = DEFAULT_AUTH_URL) {
  return `${normalizeOrigin(origin)}/c/cs_preview`;
}
