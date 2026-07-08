import type { OfficialIssuerAssetCode } from "./issuers";

export type OfficialAssetCode = "XLM" | OfficialIssuerAssetCode;

export type OfficialAssetDefinition = {
  code: OfficialAssetCode;
  displayName: string;
  description: string;
  issuedBy: string | null;
  isNative: boolean;
};

export const OFFICIAL_ASSETS: OfficialAssetDefinition[] = [
  {
    code: "USDC",
    displayName: "USDC",
    description: "Official Circle USD stablecoin",
    issuedBy: "Circle",
    isNative: false,
  },
  {
    code: "XLM",
    displayName: "XLM",
    description: "Native Stellar asset",
    issuedBy: null,
    isNative: true,
  },
  {
    code: "EURC",
    displayName: "EURC",
    description: "Official Circle euro stablecoin",
    issuedBy: "Circle",
    isNative: false,
  },
  {
    code: "PYUSD",
    displayName: "PYUSD",
    description: "Official PayPal USD stablecoin",
    issuedBy: "Paxos",
    isNative: false,
  },
  {
    code: "AUDD",
    displayName: "AUDD",
    description: "Official Australian dollar stablecoin",
    issuedBy: "AUDC Pty Ltd",
    isNative: false,
  },
  {
    code: "NGNC",
    displayName: "NGNC",
    description: "Official Nigerian naira stablecoin",
    issuedBy: "LINK.IO",
    isNative: false,
  },
];

export const DEFAULT_ORGANIZATION_ASSET_CODES = ["USDC", "XLM"] as const;
