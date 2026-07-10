"use client";

function getWebhookLabel(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export { getWebhookLabel };
