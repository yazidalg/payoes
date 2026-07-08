import currencyCodes from "currency-codes";

export const POPULAR_INVOICE_CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "IDR",
  "SGD",
  "AUD",
  "JPY",
  "CAD",
  "CHF",
  "CNY",
  "HKD",
  "INR",
  "MYR",
  "THB",
  "PHP",
  "KRW",
  "BRL",
  "MXN",
  "AED",
  "SAR",
  "NZD",
  "VND",
] as const;

export const DEFAULT_INVOICE_CURRENCY_CODE = "USD";

export const DEFAULT_INVOICE_DUE_DAYS = 30;

/** ISO 4217 currency code used for invoice pricing. */
export type InvoiceCurrencyCode = string;

export type InvoiceCurrency = {
  code: string;
  label: string;
  decimals: number;
};

function buildInvoiceCurrencies(): InvoiceCurrency[] {
  const popular = new Set<string>(POPULAR_INVOICE_CURRENCY_CODES);

  return currencyCodes.data
    .map((record) => ({
      code: record.code,
      label: `${record.currency} (${record.code})`,
      decimals: record.digits ?? 2,
    }))
    .sort((left, right) => {
      const leftPopular = popular.has(left.code);
      const rightPopular = popular.has(right.code);

      if (leftPopular !== rightPopular) {
        return leftPopular ? -1 : 1;
      }

      return left.label.localeCompare(right.label);
    });
}

export const INVOICE_CURRENCIES: InvoiceCurrency[] = buildInvoiceCurrencies();

export function getCurrencyDecimals(code: string) {
  return currencyCodes.code(code)?.digits ?? 2;
}

export function getCurrencyLabel(code: string) {
  const record = currencyCodes.code(code);

  if (!record) {
    return code;
  }

  return `${record.currency} (${record.code})`;
}
