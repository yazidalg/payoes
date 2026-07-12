export const DEFAULT_PAYMENT_EXPIRY_MINUTES = 60;

export const DEFAULT_PAYMENT_SESSION_HOURS = 1;

export const MIN_PAYMENT_EXPIRY_MINUTES = 5;

export const PLACEHOLDER_PRICING_PAYMENT_AMOUNT = "0.0000001";

export const PLATFORM_FEE_BPS = 100;

const STROOPS_PER_UNIT = 10_000_000n;
const BASIS_POINTS_PER_UNIT = 10_000n;

function stellarAmountToStroops(amount: string) {
  const [whole, fractional = ""] = normalizeStellarAmount(amount).split(".");
  return BigInt(whole) * STROOPS_PER_UNIT + BigInt(fractional);
}

function stroopsToStellarAmount(stroops: bigint) {
  const whole = stroops / STROOPS_PER_UNIT;
  const fractional = (stroops % STROOPS_PER_UNIT)
    .toString()
    .padStart(7, "0");

  return `${whole}.${fractional}`;
}

function normalizeStellarAmount(amount: string) {
  const [whole = "0", fractional = ""] = amount.trim().split(".");
  return `${whole}.${`${fractional}0000000`.slice(0, 7)}`;
}

export function calculatePlatformFeeAmount(amount: string) {
  const fee =
    (stellarAmountToStroops(amount) * BigInt(PLATFORM_FEE_BPS)) /
    BASIS_POINTS_PER_UNIT;

  return stroopsToStellarAmount(fee);
}

export function calculateMerchantSettlementAmount(amount: string) {
  const grossAmount = stellarAmountToStroops(amount);
  const platformFee =
    (grossAmount * BigInt(PLATFORM_FEE_BPS)) / BASIS_POINTS_PER_UNIT;

  return stroopsToStellarAmount(grossAmount - platformFee);
}
