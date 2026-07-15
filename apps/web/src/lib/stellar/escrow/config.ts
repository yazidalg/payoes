import { createHash } from "node:crypto";
import { encodeMuxedAccount, encodeMuxedAccountToAddress } from "@stellar/stellar-sdk";
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
  environment: Organization["environment"],
  paymentId?: string,
) {
  const operatorAddress = getStellarOperatorPublicKey(environment);

  if (!paymentId) {
    return operatorAddress;
  }

  const id = BigInt(`0x${createHash("sha256").update(paymentId).digest("hex").slice(0, 16)}`);
  return encodeMuxedAccountToAddress(
    encodeMuxedAccount(operatorAddress, id.toString()),
    true,
  );
}

export const isEscrowConfigured = isStellarOperatorConfigured;
