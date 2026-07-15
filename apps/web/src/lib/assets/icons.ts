/**
 * Asset icon lookup by asset code only (e.g. USDC, XLM).
 * Issuer is intentionally ignored so the same code always resolves to the same icon.
 */

const ASSET_ICON_URLS: Record<string, string> = {
  // Issuer-independent logos for known assets. Prefer sources that allow hotlinking.
  XLM: "https://cryptologos.cc/logos/stellar-xlm-logo.png",
  USDC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  EURC: "https://assets.coingecko.com/coins/images/26045/small/euro-coin.png",
  PYUSD: "https://cryptologos.cc/logos/paypal-usd-pyusd-logo.png",
  AUDD: "https://cdn.audd.digital/AUDD-Logo-Blue-512x512px.png",
};

/**
 * Normalizes an asset code for icon lookup.
 * Accepts plain codes ("usdc") or composite refs ("USDC:GABC...") and returns the code only.
 */
export function normalizeAssetCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "UNKNOWN";
  }

  const code = trimmed.includes(":") ? trimmed.split(":")[0] : trimmed;
  return code.toUpperCase();
}

/** Returns a logo URL for a known asset code, or null when no mapped icon exists. */
export function getAssetIconUrl(assetCode: string): string | null {
  const code = normalizeAssetCode(assetCode);
  return ASSET_ICON_URLS[code] ?? null;
}

/** Whether a mapped icon URL exists for the given asset code. */
export function hasAssetIcon(assetCode: string): boolean {
  return getAssetIconUrl(assetCode) !== null;
}
