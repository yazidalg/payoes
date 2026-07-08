import { createHmac, timingSafeEqual } from "node:crypto";
import { WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS } from "@/constants/webhooks/retry";

export function buildWebhookTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export function buildWebhookSignature(
  secret: string,
  timestamp: number,
  rawBody: string
) {
  const signedPayload = `${timestamp}.${rawBody}`;
  const digest = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return `t=${timestamp},v1=${digest}`;
}

export function buildWebhookHeaders(input: {
  secret: string;
  event: string;
  deliveryId: string;
  rawBody: string;
  timestamp?: number;
}) {
  const timestamp = input.timestamp ?? buildWebhookTimestamp();
  const signature = buildWebhookSignature(input.secret, timestamp, input.rawBody);

  return {
    "Content-Type": "application/json",
    "Payoes-Signature": signature,
    "Payoes-Event": input.event,
    "Payoes-Timestamp": String(timestamp),
    "Payoes-Delivery-ID": input.deliveryId,
  };
}

export function extractSignatureDigest(signatureHeader: string) {
  const match = signatureHeader.match(/v1=([a-f0-9]+)/i);
  return match?.[1] ?? null;
}

export function verifyPayoesWebhookSignature(input: {
  secret: string;
  rawBody: string;
  signatureHeader: string;
  timestampHeader: string;
  toleranceSeconds?: number;
}) {
  const timestamp = Number(input.timestampHeader);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const tolerance =
    input.toleranceSeconds ?? WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS;
  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - timestamp) > tolerance) {
    return false;
  }

  const providedDigest = extractSignatureDigest(input.signatureHeader);

  if (!providedDigest) {
    return false;
  }

  const expected = createHmac("sha256", input.secret)
    .update(`${timestamp}.${input.rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(providedDigest, "utf8");

  return a.length === b.length && timingSafeEqual(a, b);
}

/** @deprecated Use buildWebhookSignature with timestamped payload. */
export function signWebhookPayload(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
