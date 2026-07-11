import type { Organization } from "@/lib/db/schema";

export type SorobanPaymentRouterConfig = {
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

export function getSorobanPaymentRouterConfig(
  environment: Organization["environment"]
): SorobanPaymentRouterConfig {
  const suffix = environment === "production" ? "MAINNET" : "TESTNET";

  return {
    rpcUrl: required(`SOROBAN_${suffix}_RPC_URL`),
    contractId: required(`SOROBAN_${suffix}_PAYMENT_ROUTER_CONTRACT_ID`),
    authorizationSignerSecret: required(
      `SOROBAN_${suffix}_AUTHORIZATION_SIGNER_SECRET`
    ),
  };
}