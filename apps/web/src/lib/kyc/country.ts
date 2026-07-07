const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  indonesia: "ID",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  singapore: "SG",
  malaysia: "MY",
  philippines: "PH",
  thailand: "TH",
  vietnam: "VN",
  india: "IN",
  japan: "JP",
  "united kingdom": "GB",
  uk: "GB",
  australia: "AU",
  canada: "CA",
  germany: "DE",
  france: "FR",
};

export function normalizeCountryCode(country: string) {
  const trimmed = country.trim();

  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const mapped = COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()];

  if (mapped) {
    return mapped;
  }

  throw new Error(
    "Country must be a 2-letter ISO code (for example ID, US, SG). Full country names like Indonesia are also accepted."
  );
}
