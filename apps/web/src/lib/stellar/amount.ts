const STELLAR_AMOUNT_PATTERN = /^\d+(\.\d{1,7})?$/;

/** Compare Stellar amount strings (Horizon uses 7 decimal places). */
export function stellarAmountsEqual(a: string, b: string) {
  return normalizeStellarAmount(a) === normalizeStellarAmount(b);
}

export function normalizeStellarAmount(amount: string) {
  const trimmed = amount.trim();
  const [whole = "0", fractional = ""] = trimmed.split(".");
  const paddedFraction = `${fractional}0000000`.slice(0, 7);
  return `${whole}.${paddedFraction}`;
}

export function parseStellarAmount(value: string) {
  const normalized = value.trim().replace(/,/g, "");

  if (!normalized) {
    throw new Error("Amount is required");
  }

  if (!STELLAR_AMOUNT_PATTERN.test(normalized)) {
    throw new Error("Amount must be a valid Stellar amount (up to 7 decimal places)");
  }

  const numeric = Number(normalized);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  return normalizeStellarAmount(normalized);
}
