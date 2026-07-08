import { getInvoiceCurrency } from "@/lib/invoices/currencies";

const MAGNITUDE_DECIMAL_RULES = [
  { min: 1, maxDecimals: 4 },
  { min: 0.01, maxDecimals: 4 },
  { min: 0.000_001, maxDecimals: 6 },
  { min: 0, maxDecimals: 7 },
] as const;

const STELLAR_MAX_DECIMALS = 7;
const COMPACT_MILLION_THRESHOLD = 1_000_000;
const COMPACT_THOUSAND_THRESHOLD = 100_000;

function parseAmount(value: string | number) {
  if (typeof value === "number") {
    return value;
  }

  const normalized = value.trim().replace(/,/g, "");

  if (!normalized) {
    return Number.NaN;
  }

  return Number(normalized);
}

function getMaxFractionDigits(abs: number) {
  for (const rule of MAGNITUDE_DECIMAL_RULES) {
    if (abs >= rule.min) {
      return rule.maxDecimals;
    }
  }

  return STELLAR_MAX_DECIMALS;
}

function formatCompactAmount(abs: number, maxDecimals: number) {
  return abs.toLocaleString("en-US", {
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

function formatAbsoluteAmount(abs: number, maxDecimals: number) {
  if (abs >= COMPACT_MILLION_THRESHOLD) {
    return formatCompactAmount(abs, 2);
  }

  if (abs >= COMPACT_THOUSAND_THRESHOLD) {
    return formatCompactAmount(abs, 1);
  }

  return abs.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
    useGrouping: false,
  });
}

/**
 * Formats a Stellar token amount for display.
 * Trims trailing zeros and limits decimals based on magnitude.
 */
export function formatTokenAmount(value: string | number): string {
  const numeric = parseAmount(value);

  if (!Number.isFinite(numeric)) {
    return typeof value === "string" ? value : String(value);
  }

  if (numeric === 0) {
    return "0";
  }

  const sign = numeric < 0 ? "-" : "";
  const abs = Math.abs(numeric);
  const maxDecimals = getMaxFractionDigits(abs);
  let formatted = formatAbsoluteAmount(abs, maxDecimals);

  if (abs > 0 && Number(formatted.replace(/,/g, "")) === 0) {
    formatted = formatAbsoluteAmount(abs, STELLAR_MAX_DECIMALS);
  }

  return `${sign}${formatted}`;
}

/** Formats a token amount with its asset code, e.g. "0.5554 USDC". */
export function formatTokenWithAsset(
  amount: string | number,
  assetCode: string
): string {
  return `${formatTokenAmount(amount)} ${assetCode}`;
}

/** Formats a fiat amount with its ISO currency code, e.g. "IDR 10,000.00". */
export function formatFiatAmount(
  amount: string | number,
  currencyCode: string
): string {
  const currency = getInvoiceCurrency(currencyCode);

  if (!currency) {
    return formatTokenWithAsset(amount, currencyCode);
  }

  const numeric = Number(amount);

  if (!Number.isFinite(numeric)) {
    return `${amount} ${currencyCode}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(numeric);
}

/**
 * Formats an amount with a fiat or asset code.
 * Fiat ISO codes use locale currency formatting; stellar assets use token formatting.
 */
export function formatAmountWithUnit(
  amount: string | number | null | undefined,
  unit: string | null | undefined
): string {
  if (amount == null || amount === "") {
    return "—";
  }

  const code = unit?.trim();

  if (!code) {
    return formatTokenAmount(amount);
  }

  if (getInvoiceCurrency(code)) {
    return formatFiatAmount(amount, code);
  }

  return formatTokenWithAsset(amount, code);
}

export function formatAmountWithAsset(
  amount: string | number | null | undefined,
  asset: { asset_code: string } | null | undefined
): string {
  if (amount == null || amount === "") {
    return "—";
  }

  const assetCode = asset?.asset_code?.trim();

  if (!assetCode) {
    return formatTokenAmount(amount);
  }

  return formatAmountWithUnit(amount, assetCode);
}
