/**
 * Registry of supported stablecoins on Stellar (Circle testnet).
 * Portfolio total is shown in USD; non-USD pegs use usdPeg as approximate FX rate.
 */
export type StablecoinDefinition = {
  id: string;
  code: string;
  issuer: string;
  /** How many USD one unit of this asset represents (1 for USDC; ~FX for EURC). */
  usdPeg: number;
};

export const STELLAR_TESTNET_STABLECOINS: readonly StablecoinDefinition[] = [
  {
    id: "usdc",
    code: "USDC",
    issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    usdPeg: 1,
  },
  {
    id: "eurc",
    code: "EURC",
    issuer: "GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO",
    usdPeg: 1.08,
  },
] as const;

export function getStablecoinsForNetwork(
  network: "testnet" | "mainnet",
): readonly StablecoinDefinition[] {
  if (network === "testnet") return STELLAR_TESTNET_STABLECOINS;
  // Mainnet registry can be added when needed
  return [];
}
