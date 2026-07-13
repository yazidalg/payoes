import { Keypair } from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";

function readEnv(name: string) {
  return process.env[name]?.trim() || null;
}

/**
 * Single Stellar operator keypair per network.
 * Used for Soroban authorization, classic escrow deposits, and sandbox simulation.
 */
export function getStellarOperatorSecret(
  environment: Organization["environment"]
) {
  const suffix = environment === "production" ? "MAINNET" : "TESTNET";
  return readEnv(`STELLAR_${suffix}_OPERATOR_SECRET`);
}

export function getStellarOperatorKeypair(environment: Organization["environment"]) {
  const secret = getStellarOperatorSecret(environment);

  if (!secret) {
    throw new Error(
      `STELLAR_${environment === "production" ? "MAINNET" : "TESTNET"}_OPERATOR_SECRET is not configured`
    );
  }

  return Keypair.fromSecret(secret);
}

export function getStellarOperatorPublicKey(
  environment: Organization["environment"]
) {
  return getStellarOperatorKeypair(environment).publicKey();
}

export function isStellarOperatorConfigured(
  environment: Organization["environment"]
) {
  return Boolean(getStellarOperatorSecret(environment));
}
