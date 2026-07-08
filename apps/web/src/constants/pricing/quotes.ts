export const DEFAULT_SLIPPAGE_BPS = 50;

export const RATE_CACHE_TTL_MS = 60_000;

export const DEFAULT_INVOICE_QUOTE_TTL_MINUTES = 15;

export const STABLECOIN_FIAT_MAP: Record<string, string> = {
  USDC: "USD",
  PYUSD: "USD",
  EURC: "EUR",
  AUDD: "AUD",
  NGNC: "USD",
};

export const ASSET_TO_COINGECKO: Record<string, string> = {
  XLM: "stellar",
  USDC: "usd-coin",
  EURC: "euro-coin",
  PYUSD: "paypal-usd",
  AUDD: "novatti-australian-digital-dollar",
};
