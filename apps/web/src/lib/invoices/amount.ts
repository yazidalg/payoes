import { formatAmountWithUnit } from "@/lib/format/amount";
import { getInvoiceCurrency, type InvoiceCurrencyCode } from "@/lib/invoices/currencies";
import { normalizeStellarAmount } from "@/lib/stellar/amount";

export type InvoiceLineItemInput = {
  description: string;
  quantity: string;
  unitAmount: string;
};

export function parseFiatAmount(value: string, currencyCode: InvoiceCurrencyCode) {
  const currency = getInvoiceCurrency(currencyCode);

  if (!currency) {
    throw new Error("Unsupported invoice currency");
  }

  const normalized = value.trim().replace(/,/g, "");

  if (!normalized) {
    throw new Error("Amount is required");
  }

  const pattern =
    currency.decimals === 0
      ? /^\d+$/
      : new RegExp(`^\\d+(\\.\\d{1,${currency.decimals}})?$`);

  if (!pattern.test(normalized)) {
    throw new Error(
      currency.decimals === 0
        ? `${currencyCode} amounts must be whole numbers`
        : `${currencyCode} amounts support up to ${currency.decimals} decimal places`
    );
  }

  const numeric = Number(normalized);

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("Amount must be a valid number");
  }

  if (currency.decimals === 0) {
    return String(Math.round(numeric));
  }

  return numeric.toFixed(currency.decimals);
}

export function lineItemAmount(
  item: InvoiceLineItemInput,
  currencyCode: InvoiceCurrencyCode = "USD"
) {
  const quantity = Number(item.quantity);
  const unitAmount = Number(parseFiatAmount(item.unitAmount, currencyCode));

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Item quantity must be greater than zero");
  }

  const currency = getInvoiceCurrency(currencyCode)!;
  const lineTotal = quantity * unitAmount;

  if (currency.decimals === 0) {
    return String(Math.round(lineTotal));
  }

  return lineTotal.toFixed(currency.decimals);
}

export function calculateInvoiceTotal(
  items: InvoiceLineItemInput[],
  currencyCode: InvoiceCurrencyCode = "USD"
) {
  if (items.length === 0) {
    throw new Error("Add at least one invoice item");
  }

  const currency = getInvoiceCurrency(currencyCode);

  if (!currency) {
    throw new Error("Unsupported invoice currency");
  }

  const total = items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const unitAmount = Number(parseFiatAmount(item.unitAmount, currencyCode));
    return sum + quantity * unitAmount;
  }, 0);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Invoice total must be greater than zero");
  }

  if (currency.decimals === 0) {
    return String(Math.round(total));
  }

  return total.toFixed(currency.decimals);
}

export function calculateTotalQuantity(items: InvoiceLineItemInput[]) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return sum;
    }

    return sum + quantity;
  }, 0);
}

export function formatInvoiceAmount(
  amount: string,
  currencyOrAsset: string,
  currencyCode?: InvoiceCurrencyCode
) {
  return formatAmountWithUnit(amount, currencyCode ?? currencyOrAsset);
}

/** @deprecated Use parseFiatAmount for invoice line items */
export { normalizeStellarAmount };
