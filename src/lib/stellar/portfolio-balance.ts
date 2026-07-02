import { NotFoundError } from "@stellar/stellar-sdk";
import { getHorizonServer } from "./horizon";
import {
  getStablecoinsForNetwork,
  type StablecoinDefinition,
} from "./stablecoins";

export type StablecoinBalance = {
  code: string;
  balance: string;
  usdValue: number;
};

export type PortfolioBalance = {
  totalUsd: number;
  stablecoins: StablecoinBalance[];
};

export type HorizonBalance = {
  asset_type: string;
  balance?: string;
  asset_code?: string;
  asset_issuer?: string;
};

export function parseBalanceAmount(balance: string): number {
  const value = parseFloat(balance);
  return Number.isFinite(value) ? value : 0;
}

export function stablecoinToUsd(
  balance: string,
  usdPeg: number,
): number {
  return parseBalanceAmount(balance) * usdPeg;
}

export function findStablecoinBalance(
  accountBalances: HorizonBalance[],
  stablecoin: StablecoinDefinition,
): string | null {
  const entry = accountBalances.find(
    (b) =>
      b.asset_type !== "native" &&
      b.asset_code === stablecoin.code &&
      b.asset_issuer === stablecoin.issuer,
  );

  if (!entry) return null;
  return entry.balance ?? "0.0000000";
}

export function buildPortfolioFromBalances(
  accountBalances: HorizonBalance[],
  network: "testnet" | "mainnet" = "testnet",
): PortfolioBalance {
  const stablecoins: StablecoinBalance[] = [];

  for (const definition of getStablecoinsForNetwork(network)) {
    const balance = findStablecoinBalance(accountBalances, definition);
    if (balance === null) continue;

    stablecoins.push({
      code: definition.code,
      balance,
      usdValue: stablecoinToUsd(balance, definition.usdPeg),
    });
  }

  return {
    totalUsd: computeTotalUsd(stablecoins),
    stablecoins,
  };
}

export function computeTotalUsd(stablecoins: StablecoinBalance[]): number {
  return stablecoins.reduce((sum, asset) => sum + asset.usdValue, 0);
}

export async function getPortfolioBalance(
  publicKey: string,
  network: "testnet" | "mainnet" = "testnet",
): Promise<PortfolioBalance> {
  try {
    const account = await getHorizonServer().loadAccount(publicKey);
    return buildPortfolioFromBalances(
      account.balances as HorizonBalance[],
      network,
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { totalUsd: 0, stablecoins: [] };
    }
    throw error;
  }
}
