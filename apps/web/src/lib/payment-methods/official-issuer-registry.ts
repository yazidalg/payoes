import type { Organization } from "@/lib/db/schema";

/**
 * Default Stellar issuers from official issuer documentation.
 * Environment variables can override these per asset (see stellar/env.ts).
 *
 * Sources:
 * - USDC / EURC: https://developers.circle.com/stablecoins/
 * - PYUSD: PayPal / Paxos Stellar whitepaper
 * - AUDD: https://devhub.audd.digital/docs/supported-blockchains
 * - NGNC: https://ngnc.online/.well-known/stellar.toml
 */
export const OFFICIAL_STELLAR_ISSUERS = {
  USDC: {
    sandbox: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    production: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  },
  EURC: {
    sandbox: "GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO",
    production: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2",
  },
  PYUSD: {
    sandbox: "GBT2KJDKUZYZTQPCSR57VZT5NJHI4H7FOB5LT5FPRWSR7I5B4FS3UU7G",
    production: "GDQE7IXJ4HUHV6RQHIUPRJSEZE4DRS5WY577O2FY6YQ5LVWZ7JZTU2V5",
  },
  AUDD: {
    sandbox: "GBAQ7FQE2AIXWTX4TCMXEMB3EZSBF565LK5NBKNBTAMLNLX3BHUTFRAI",
    production: "GDC7X2MXTYSAKUUGAIQ7J7RPEIM7GXSAIWFYWWH4GLNFECQVJJLB2EEU",
  },
  NGNC: {
    sandbox: null,
    production: "GASBV6W7GGED66MXEVC7YZHTWWYMSVYEY35USF2HJZBLABLYIFQGXZY6",
  },
} as const;

export type OfficialIssuerAssetCode = keyof typeof OFFICIAL_STELLAR_ISSUERS;

export function getBuiltinOfficialIssuer(
  code: OfficialIssuerAssetCode,
  environment: Organization["environment"]
): string | null {
  return OFFICIAL_STELLAR_ISSUERS[code][environment];
}
