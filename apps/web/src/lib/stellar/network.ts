import { Networks } from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";
import {
  HORIZON_MAINNET_URL,
  HORIZON_TESTNET_URL,
} from "@/constants/stellar";

export type StellarEnvironment = Organization["environment"];

export function getNetworkPassphrase(environment: StellarEnvironment) {
  return environment === "production" ? Networks.PUBLIC : Networks.TESTNET;
}

export function getHorizonUrl(environment: StellarEnvironment) {
  return environment === "production" ? HORIZON_MAINNET_URL : HORIZON_TESTNET_URL;
}

export function getNetworkLabel(environment: StellarEnvironment) {
  return environment === "production" ? "Mainnet" : "Testnet";
}
