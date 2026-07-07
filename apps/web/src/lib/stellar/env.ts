import { StrKey } from "@stellar/stellar-sdk";

function requireStellarIssuerEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not set. Add it to apps/web/.env.local (see .env.example).`
    );
  }

  if (!StrKey.isValidEd25519PublicKey(value)) {
    throw new Error(`${name} must be a valid Stellar public key (G...).`);
  }

  return value;
}

export const STELLAR_TESTNET_USDC_ISSUER = requireStellarIssuerEnv(
  "STELLAR_TESTNET_USDC_ISSUER"
);

export const STELLAR_MAINNET_USDC_ISSUER = requireStellarIssuerEnv(
  "STELLAR_MAINNET_USDC_ISSUER"
);
