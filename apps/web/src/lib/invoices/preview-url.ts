import { DEFAULT_APP_URL } from "@/constants/app";
import type { InvoicePresentation } from "@/lib/invoices/presentation";

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

export function getInvoiceCheckoutPreviewUrl(
  presentation: InvoicePresentation,
  origin = DEFAULT_APP_URL,
) {
  if (presentation.checkoutUrl) {
    return presentation.checkoutUrl;
  }

  return `${normalizeOrigin(origin)}/c/cs_preview`;
}

export function formatBrowserAddressBarUrl(url: string) {
  return url.replace(/^https?:\/\//, "");
}
