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
