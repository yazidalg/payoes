export const ACCEPTED_ASSET_OPTIONS = ["USDC", "XLM"] as const;
export type AcceptedAsset = (typeof ACCEPTED_ASSET_OPTIONS)[number];
