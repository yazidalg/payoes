import { StrKey } from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";
import {
  getBuiltinOfficialIssuer,
  type OfficialIssuerAssetCode,
} from "@/lib/payment-methods/official-issuer-registry";

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

const ISSUER_ENV_KEYS: Record<
  OfficialIssuerAssetCode,
  { sandbox: string; production: string }
> = {
  USDC: {
    sandbox: "STELLAR_TESTNET_USDC_ISSUER",
    production: "STELLAR_MAINNET_USDC_ISSUER",
  },
  EURC: {
    sandbox: "STELLAR_TESTNET_EURC_ISSUER",
    production: "STELLAR_MAINNET_EURC_ISSUER",
  },
  PYUSD: {
    sandbox: "STELLAR_TESTNET_PYUSD_ISSUER",
    production: "STELLAR_MAINNET_PYUSD_ISSUER",
  },
  AUDD: {
    sandbox: "STELLAR_TESTNET_AUDD_ISSUER",
    production: "STELLAR_MAINNET_AUDD_ISSUER",
  },
  NGNC: {
    sandbox: "STELLAR_TESTNET_NGNC_ISSUER",
    production: "STELLAR_MAINNET_NGNC_ISSUER",
  },
};

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
