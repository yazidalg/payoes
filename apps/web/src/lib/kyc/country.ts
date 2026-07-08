import { COUNTRY_NAME_TO_CODE } from "@/constants/kyc";

export function normalizeCountryCode(country: string) {
  const trimmed = country.trim();

  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const mapped = COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()];

  if (mapped) {
    return mapped;
  }

  return trimmed.slice(0, 2).toUpperCase();
}
