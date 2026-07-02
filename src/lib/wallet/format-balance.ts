export function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatUsdDisplay(amount: number): string {
  return `$${formatUsd(amount)}`;
}
