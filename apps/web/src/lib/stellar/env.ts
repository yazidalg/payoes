import { StrKey } from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";
import { ISSUER_ENV_KEYS } from "@/constants/assets/issuer-env-keys";
import type { OfficialIssuerAssetCode } from "@/constants/assets/issuers";
import { getBuiltinOfficialIssuer } from "@/lib/payment-methods/official-issuer-registry";

function readOptionalIssuerEnv(name: string): string | null {
  const value = process.env[name]?.trim();

  if (!value) {
    return null;
  }

  if (!StrKey.isValidEd25519PublicKey(value)) {
    throw new Error(`${name} must be a valid Stellar public key (G...).`);
  }

  return value;
}

export function getOfficialAssetIssuer(
  code: OfficialIssuerAssetCode,
  environment: Organization["environment"]
): string | null {
  const envKey = ISSUER_ENV_KEYS[code][environment];
  const fromEnv = readOptionalIssuerEnv(envKey);

  if (fromEnv) {
    return fromEnv;
  }

  return getBuiltinOfficialIssuer(code, environment);
}

/** @deprecated Use getOfficialAssetIssuer("USDC", environment) */
export function getUsdcIssuer(environment: Organization["environment"]) {
  const issuer = getOfficialAssetIssuer("USDC", environment);

  if (!issuer) {
    throw new Error("USDC issuer is not configured for this environment");
  }

  return issuer;
}

/** @deprecated Use getOfficialAssetIssuer("EURC", environment) */
export function getEurcIssuer(environment: Organization["environment"]) {
  const issuer = getOfficialAssetIssuer("EURC", environment);

  if (!issuer) {
    throw new Error("EURC issuer is not configured for this environment");
  }

  return issuer;
}
