import currencyCodes from "currency-codes";
import {
  DEFAULT_INVOICE_CURRENCY_CODE,
  INVOICE_CURRENCIES,
  type InvoiceCurrency,
  type InvoiceCurrencyCode,
} from "@/constants/invoices/currencies";

export type { InvoiceCurrency, InvoiceCurrencyCode };
export { INVOICE_CURRENCIES, DEFAULT_INVOICE_CURRENCY_CODE };

export function getInvoiceCurrency(code: string): InvoiceCurrency | null {
  const record = currencyCodes.code(code);

  if (!record) {
    return null;
  }

  return {
    code: record.code,
    label: `${record.currency} (${record.code})`,
    decimals: record.digits ?? 2,
  };
}

export function isInvoiceCurrencyCode(code: string): code is InvoiceCurrencyCode {
  return Boolean(currencyCodes.code(code));
}

export function fiatAmountPattern(currencyCode: string) {
  const currency = getInvoiceCurrency(currencyCode);

  if (!currency) {
    return /^\d+$/;
  }

  if (currency.decimals === 0) {
    return /^\d+$/;
  }

  return new RegExp(`^\\d+(\\.\\d{1,${currency.decimals}})?$`);
}

export function resolveInvoiceCurrencyCode(code?: string | null): string {
  const normalized = code?.trim().toUpperCase() ?? "";
  return isInvoiceCurrencyCode(normalized) ? normalized : DEFAULT_INVOICE_CURRENCY_CODE;
}

/** Lowercase ISO code for CoinGecko `vs_currencies` parameter. */
export function getCoinGeckoFiatCode(currencyCode: string) {
  return currencyCode.toLowerCase();
}
