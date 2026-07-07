import { Networks } from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";

export type StellarEnvironment = Organization["environment"];

export function getNetworkPassphrase(environment: StellarEnvironment) {
  return environment === "production" ? Networks.PUBLIC : Networks.TESTNET;
}

export function getHorizonUrl(environment: StellarEnvironment) {
  return environment === "production"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";
}

export function getNetworkLabel(environment: StellarEnvironment) {
  return environment === "production" ? "Mainnet" : "Testnet";
}
