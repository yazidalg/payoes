import { createHmac, timingSafeEqual } from "node:crypto";
import type { OrganizationIntegration } from "@/lib/db/schema";
import type { ShopifyCredentials } from "../types";
import { getShopifyClientSecret } from "./oauth";

export function verifyShopifyWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
}) {
  if (!input.signatureHeader) {
    return false;
  }

  const digest = createHmac("sha256", getShopifyClientSecret())
    .update(input.rawBody, "utf8")
    .digest("base64");

  const provided = Buffer.from(input.signatureHeader);
  const expected = Buffer.from(digest);

  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

export function getShopifyAccessToken(integration: OrganizationIntegration) {
  const credentials = integration.credentials as ShopifyCredentials | null;
  return credentials?.accessToken ?? null;
}
