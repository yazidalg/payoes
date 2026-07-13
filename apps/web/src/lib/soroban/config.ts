import type { Organization } from "@/lib/db/schema";
import {
  getStellarOperatorSecret,
  isStellarOperatorConfigured,
} from "@/lib/stellar/operator";

export type SorobanConfig = {
  rpcUrl: string;
  contractId: string;
  authorizationSignerSecret: string;
};

function required(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getSorobanConfig(
  environment: Organization["environment"]
): SorobanConfig {
  const suffix = environment === "production" ? "MAINNET" : "TESTNET";
  const contractId = process.env[`SOROBAN_${suffix}_CONTRACT_ID`]?.trim();
  const authorizationSignerSecret = getStellarOperatorSecret(environment);

  if (!contractId) {
    throw new Error(`SOROBAN_${suffix}_CONTRACT_ID is not configured`);
  }

  if (!authorizationSignerSecret) {
    throw new Error(`STELLAR_${suffix}_OPERATOR_SECRET is not configured`);
  }

  return {
    rpcUrl: required(`SOROBAN_${suffix}_RPC_URL`),
    contractId,
    authorizationSignerSecret,
  };
}

export function isSorobanConfigured(environment: Organization["environment"]) {
  const suffix = environment === "production" ? "MAINNET" : "TESTNET";

  return Boolean(
    process.env[`SOROBAN_${suffix}_RPC_URL`]?.trim() &&
      process.env[`SOROBAN_${suffix}_CONTRACT_ID`]?.trim() &&
      isStellarOperatorConfigured(environment)
  );
}
