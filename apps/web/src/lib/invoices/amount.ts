import { normalizeStellarAmount } from "@/lib/stellar/amount";

export type InvoiceLineItemInput = {
  description: string;
  quantity: string;
  unitAmount: string;
};

export function lineItemAmount(item: InvoiceLineItemInput) {
  const quantity = Number(item.quantity);
  const unitAmount = Number(item.unitAmount);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Item quantity must be greater than zero");
  }

  if (!Number.isFinite(unitAmount) || unitAmount < 0) {
    throw new Error("Item unit amount must be valid");
  }

  return normalizeStellarAmount((quantity * unitAmount).toFixed(7));
}

export function calculateInvoiceTotal(items: InvoiceLineItemInput[]) {
  if (items.length === 0) {
    throw new Error("Add at least one invoice item");
  }

  const total = items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const unitAmount = Number(item.unitAmount);
    return sum + quantity * unitAmount;
  }, 0);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Invoice total must be greater than zero");
  }

  return normalizeStellarAmount(total.toFixed(7));
}

export function formatInvoiceAmount(amount: string, asset: string) {
  const numeric = Number(amount);
  const formatted = Number.isFinite(numeric)
    ? numeric.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 7,
      })
    : amount;

  return `${formatted} ${asset}`;
}
