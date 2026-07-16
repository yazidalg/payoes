import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type IntegrationOAuthState = {
  organizationId: string;
  environment: "sandbox" | "production";
  provider: "shopify";
  shop: string;
  nonce: string;
};

function getStateSecret() {
  return (
    process.env.INTEGRATIONS_STATE_SECRET ??
    process.env.AUTH_SECRET ??
    "payoes-integrations-dev-secret"
  );
}

export function createIntegrationOAuthState(
  input: Omit<IntegrationOAuthState, "nonce">,
) {
  const payload: IntegrationOAuthState = {
    ...input,
    nonce: randomBytes(16).toString("base64url"),
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getStateSecret())
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

export function parseIntegrationOAuthState(state: string) {
  const [encoded, signature] = state.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = createHmac("sha256", getStateSecret())
    .update(encoded)
    .digest("base64url");

  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    provided.length !== expectedBuffer.length ||
    !timingSafeEqual(provided, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as IntegrationOAuthState;
  } catch {
    return null;
  }
}
