import type { AllowedAsset } from "@/lib/assets/types";
import type { InvoiceCurrencyCode } from "@/lib/invoices/currencies";
import {
  ASSET_TO_COINGECKO,
  DEFAULT_INVOICE_QUOTE_TTL_MINUTES,
  DEFAULT_SLIPPAGE_BPS,
  RATE_CACHE_TTL_MS,
  STABLECOIN_FIAT_MAP,
} from "@/constants/pricing/quotes";
import {
  getCoinGeckoFiatCode,
} from "@/lib/invoices/currencies";
import { normalizeStellarAmount } from "@/lib/stellar/amount";

export { DEFAULT_SLIPPAGE_BPS };

type RateCacheEntry = {
  expiresAt: number;
  rates: Record<string, number>;
};

const rateCache = new Map<string, RateCacheEntry>();

function getQuoteTtlMinutes() {
  const parsed = Number(
    process.env.INVOICE_QUOTE_TTL_MINUTES ??
      String(DEFAULT_INVOICE_QUOTE_TTL_MINUTES)
  );
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_INVOICE_QUOTE_TTL_MINUTES;
}

function getSettlementFiatCode(assetCode: string): InvoiceCurrencyCode {
  return STABLECOIN_FIAT_MAP[assetCode] ?? "USD";
}

async function getFiatPerUsd(fiatCurrency: InvoiceCurrencyCode) {
  if (fiatCurrency === "USD") {
    return 1;
  }

  return fetchFiatPerUsd(fiatCurrency);
}

async function getInvoiceUsdValue(
  amount: string,
  currency: InvoiceCurrencyCode
) {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Invalid invoice amount for quote");
  }

  const fiatPerUsd = await getFiatPerUsd(currency);
  return numeric / fiatPerUsd;
}

function assertQuoteUsdValue(
  invoiceUsdValue: number,
  paidAmount: string,
  paidAssetUsdPrice: number
) {
  const paidNumeric = Number(paidAmount);

  if (!Number.isFinite(paidNumeric) || paidNumeric <= 0) {
    throw new Error("Invalid quoted paid amount");
  }

  const paidUsdValue = paidNumeric * paidAssetUsdPrice;
  const ratio = paidUsdValue / invoiceUsdValue;

  // Reject quotes that are wildly off — catches inverted rates and bad price data.
  if (ratio < 0.5 || ratio > 2) {
    throw new Error(
      "Unable to build a reliable quote for this currency pair. Please try again."
    );
  }
}

async function fetchFiatPerUsd(fiatCurrency: InvoiceCurrencyCode) {
  if (fiatCurrency === "USD") {
    return 1;
  }

  const cacheKey = `fiat:${fiatCurrency}`;
  const cached = rateCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.rates.usd;
  }

  const vs = getCoinGeckoFiatCode(fiatCurrency);
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", "usd-coin");
  url.searchParams.set("vs_currencies", vs);

  const headers: HeadersInit = { Accept: "application/json" };
  const apiKey = process.env.COINGECKO_API_KEY?.trim();

  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  const response = await fetch(url, { headers, next: { revalidate: 60 } });

  if (!response.ok) {
    throw new Error("Unable to fetch fiat exchange rates");
  }

  const data = (await response.json()) as Record<string, Record<string, number>>;
  const fiatPerUsd = data["usd-coin"]?.[vs];

  if (!fiatPerUsd || fiatPerUsd <= 0) {
    throw new Error(`Exchange rate unavailable for ${fiatCurrency}`);
  }

  rateCache.set(cacheKey, {
    expiresAt: Date.now() + RATE_CACHE_TTL_MS,
    rates: { usd: fiatPerUsd },
  });

  return fiatPerUsd;
}

async function convertFiatAmount(
  amount: string,
  from: InvoiceCurrencyCode,
  to: InvoiceCurrencyCode
) {
  if (from === to) {
    return amount;
  }

  const numeric = Number(amount);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Invalid amount for conversion");
  }

  const fromPerUsd = await getFiatPerUsd(from);
  const toPerUsd = await getFiatPerUsd(to);
  const usdAmount = numeric / fromPerUsd;
  const converted = usdAmount * toPerUsd;

  return converted.toFixed(7);
}

async function fetchAssetPriceInFiat(
  assetCode: string,
  fiatCurrency: InvoiceCurrencyCode
) {
  const pegged = STABLECOIN_FIAT_MAP[assetCode];

  if (pegged) {
    const peggedPerUsd = await getFiatPerUsd(pegged as InvoiceCurrencyCode);
    const targetPerUsd = await getFiatPerUsd(fiatCurrency);

    // Price of 1 stablecoin unit in the invoice fiat (e.g. USDC in IDR ≈ 16,000).
    const price = targetPerUsd / peggedPerUsd;

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Exchange rate unavailable for ${assetCode}`);
    }

    if (price < 0.01) {
      throw new Error(`Exchange rate out of acceptable range for ${assetCode}`);
    }

    return price;
  }

  const cacheKey = `asset:${assetCode}:${fiatCurrency}`;
  const cached = rateCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.rates.price;
  }

  const coinId = ASSET_TO_COINGECKO[assetCode];

  if (!coinId) {
    throw new Error(`Pricing is not available for ${assetCode}`);
  }

  const vs = getCoinGeckoFiatCode(fiatCurrency);
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", coinId);
  url.searchParams.set("vs_currencies", vs);

  const headers: HeadersInit = { Accept: "application/json" };
  const apiKey = process.env.COINGECKO_API_KEY?.trim();

  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  const response = await fetch(url, { headers, next: { revalidate: 60 } });

  if (!response.ok) {
    throw new Error("Unable to fetch asset prices");
  }

  const data = (await response.json()) as Record<string, Record<string, number>>;
  const price = data[coinId]?.[vs];

  if (!price || price <= 0) {
    throw new Error(`Price unavailable for ${assetCode}`);
  }

  rateCache.set(cacheKey, {
    expiresAt: Date.now() + RATE_CACHE_TTL_MS,
    rates: { price },
  });

  return price;
}

export async function getAssetToFiatRate(
  assetCode: string,
  fiatCurrency: InvoiceCurrencyCode
) {
  return fetchAssetPriceInFiat(assetCode, fiatCurrency);
}

export function applySendMaxBuffer(amount: string, slippageBps = DEFAULT_SLIPPAGE_BPS) {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Invalid amount for send max buffer");
  }

  const buffered = numeric * (1 + slippageBps / 10_000);
  return normalizeStellarAmount(buffered.toFixed(7));
}

export function assetsMatch(
  left: AllowedAsset,
  right: AllowedAsset
) {
  return (
    left.asset_code === right.asset_code &&
    (left.issuer_address?.trim() || null) === (right.issuer_address?.trim() || null)
  );
}

export async function buildPaymentQuote(input: {
  pricingAmount: string;
  pricingCurrency: InvoiceCurrencyCode;
  paidAsset: AllowedAsset;
  settlementAsset: AllowedAsset;
}) {
  const invoiceTotal = Number(input.pricingAmount);

  if (!Number.isFinite(invoiceTotal) || invoiceTotal <= 0) {
    throw new Error("Invalid invoice amount for quote");
  }

  const assetPriceInFiat = await fetchAssetPriceInFiat(
    input.paidAsset.asset_code,
    input.pricingCurrency
  );

  const paidAmountRaw = invoiceTotal / assetPriceInFiat;
  const paidAmount = normalizeStellarAmount(paidAmountRaw.toFixed(7));

  const invoiceUsdValue = await getInvoiceUsdValue(
    input.pricingAmount,
    input.pricingCurrency
  );
  const paidAssetUsdPrice = await fetchAssetPriceInFiat(
    input.paidAsset.asset_code,
    "USD"
  );
  assertQuoteUsdValue(invoiceUsdValue, paidAmount, paidAssetUsdPrice);

  const settlementFiat = getSettlementFiatCode(input.settlementAsset.asset_code);
  const settlementFiatAmount = await convertFiatAmount(
    input.pricingAmount,
    input.pricingCurrency,
    settlementFiat
  );
  const settlementAmount = normalizeStellarAmount(settlementFiatAmount);

  const paidNumeric = Number(paidAmount);
  const settlementNumeric = Number(settlementAmount);
  const settlementQuoteRate =
    paidNumeric > 0
      ? (settlementNumeric / paidNumeric).toFixed(7)
      : "0";

  const expiresAt = new Date(Date.now() + getQuoteTtlMinutes() * 60 * 1000);

  return {
    pricing_amount: input.pricingAmount,
    pricing_currency: input.pricingCurrency,
    paid_asset: input.paidAsset,
    paid_amount: paidAmount,
    settlement_asset: input.settlementAsset,
    settlement_amount: settlementAmount,
    rate: assetPriceInFiat.toString(),
    settlement_quote_rate: settlementQuoteRate,
    requires_path_payment: !assetsMatch(input.paidAsset, input.settlementAsset),
    expires_at: expiresAt,
  };
}

export function isQuoteExpired(expiresAt: Date | null | undefined) {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export function amountsWithinSlippage(
  expected: string,
  actual: string,
  slippageBps = DEFAULT_SLIPPAGE_BPS
) {
  const expectedNum = Number(expected);
  const actualNum = Number(actual);

  if (!Number.isFinite(expectedNum) || !Number.isFinite(actualNum)) {
    return false;
  }

  if (expectedNum === 0) {
    return actualNum === 0;
  }

  const diff = Math.abs(actualNum - expectedNum) / expectedNum;
  return diff <= slippageBps / 10_000;
}
