import { NotFoundError } from "@stellar/stellar-sdk";
import { getHorizonServer } from "./horizon";
import {
  findStablecoinBalance,
  type HorizonBalance,
} from "./portfolio-balance";
import {
  buildChangeTrustTransaction,
  submitSignedTransaction,
} from "./trustline";
import {
  getStablecoinsForNetwork,
  type StablecoinDefinition,
} from "./stablecoins";
import { signAndAttachSignature } from "@/lib/wallet/turnkey-signer";

export type TrustlineSetupResult = {
  established: string[];
  skipped: string[];
  failed: { code: string; error: string }[];
};

export async function getAccountBalances(
  publicKey: string,
): Promise<HorizonBalance[]> {
  const account = await getHorizonServer().loadAccount(publicKey);
  return account.balances as HorizonBalance[];
}

export function getMissingTrustlines(
  accountBalances: HorizonBalance[],
  network: "testnet" | "mainnet" = "testnet",
): StablecoinDefinition[] {
  return getStablecoinsForNetwork(network).filter(
    (stablecoin) =>
      findStablecoinBalance(accountBalances, stablecoin) === null,
  );
}

export async function establishTrustline(
  publicKey: string,
  organizationId: string,
  stablecoin: StablecoinDefinition,
) {
  const transaction = await buildChangeTrustTransaction(publicKey, stablecoin);
  await signAndAttachSignature(publicKey, organizationId, transaction);
  return submitSignedTransaction(transaction);
}

export async function ensureStablecoinTrustlines(
  publicKey: string,
  organizationId: string,
  network: "testnet" | "mainnet" = "testnet",
): Promise<TrustlineSetupResult> {
  const result: TrustlineSetupResult = {
    established: [],
    skipped: [],
    failed: [],
  };

  let accountBalances: HorizonBalance[];

  try {
    accountBalances = await getAccountBalances(publicKey);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return result;
    }
    throw error;
  }

  const missing = getMissingTrustlines(accountBalances, network);

  for (const stablecoin of missing) {
    try {
      await establishTrustline(publicKey, organizationId, stablecoin);
      result.established.push(stablecoin.code);
    } catch (error) {
      result.failed.push({
        code: stablecoin.code,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const alreadyActive = getStablecoinsForNetwork(network).filter(
    (stablecoin) =>
      findStablecoinBalance(accountBalances, stablecoin) !== null,
  );

  result.skipped = alreadyActive.map((stablecoin) => stablecoin.code);

  return result;
}
