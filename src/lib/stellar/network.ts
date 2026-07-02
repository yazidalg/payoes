export const STELLAR_NETWORK = "testnet" as const;

export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export const FRIENDBOT_URL = "https://friendbot.stellar.org";

export const NETWORK_PASSPHRASE =
  "Test SDF Network ; September 2015";

export {
  STELLAR_TESTNET_STABLECOINS,
  type StablecoinDefinition,
} from "./stablecoins";

import { STELLAR_TESTNET_STABLECOINS } from "./stablecoins";

const usdc = STELLAR_TESTNET_STABLECOINS.find((asset) => asset.id === "usdc")!;
const eurc = STELLAR_TESTNET_STABLECOINS.find((asset) => asset.id === "eurc")!;

export const USDC_ISSUER = usdc.issuer;
export const USDC_ASSET_CODE = usdc.code;
export const EURC_ISSUER = eurc.issuer;
export const EURC_ASSET_CODE = eurc.code;
