import type { OfficialIssuerAssetCode } from "./issuers";

export const ISSUER_ENV_KEYS: Record<
  OfficialIssuerAssetCode,
  { sandbox: string; production: string }
> = {
  USDC: {
    sandbox: "STELLAR_TESTNET_USDC_ISSUER",
    production: "STELLAR_MAINNET_USDC_ISSUER",
  },
  EURC: {
    sandbox: "STELLAR_TESTNET_EURC_ISSUER",
    production: "STELLAR_MAINNET_EURC_ISSUER",
  },
  PYUSD: {
    sandbox: "STELLAR_TESTNET_PYUSD_ISSUER",
    production: "STELLAR_MAINNET_PYUSD_ISSUER",
  },
  AUDD: {
    sandbox: "STELLAR_TESTNET_AUDD_ISSUER",
    production: "STELLAR_MAINNET_AUDD_ISSUER",
  },
  NGNC: {
    sandbox: "STELLAR_TESTNET_NGNC_ISSUER",
    production: "STELLAR_MAINNET_NGNC_ISSUER",
  },
};
