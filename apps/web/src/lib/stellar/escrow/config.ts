import type { Organization } from "@/lib/db/schema";
import {
  getStellarOperatorKeypair,
  getStellarOperatorPublicKey,
  isStellarOperatorConfigured,
} from "@/lib/stellar/operator";

export type EscrowConfig = {
  publicKey: string;
  keypair: ReturnType<typeof getStellarOperatorKeypair>;
};

export function getEscrowConfig(
  environment: Organization["environment"]
): EscrowConfig {
  const keypair = getStellarOperatorKeypair(environment);

  return {
    publicKey: keypair.publicKey(),
    keypair,
  };
}

export function getEscrowDepositAddress(
  environment: Organization["environment"]
) {
  return getStellarOperatorPublicKey(environment);
}

export const isEscrowConfigured = isStellarOperatorConfigured;
