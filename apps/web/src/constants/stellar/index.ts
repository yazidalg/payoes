export const HORIZON_MAINNET_URL = "https://horizon.stellar.org";

export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";

export const STELLAR_ASSET_CODE_PATTERN = /^[A-Za-z0-9]{1,12}$/;

export const STELLAR_TRANSACTION_TIMEOUT_SECONDS = 300;

export const STELLAR_MEMO_MAX_LENGTH = 28;

export const STELLAR_OPERATION_ERROR_MESSAGES: Record<string, string> = {
  op_no_trust:
    "Your wallet is missing a trustline for this asset. Add the trustline in your wallet before paying.",
  op_underfunded:
    "Insufficient balance. Make sure your wallet has enough USDC (or XLM for native payments) to complete this payment.",
  op_line_full:
    "The destination account cannot receive more of this asset. The merchant may need to adjust their trustline limit.",
  op_too_few_offers:
    "Not enough liquidity on the Stellar DEX to convert your payment asset into the merchant settlement asset. Try paying with the settlement asset directly, or ask the merchant to change settlement settings.",
  op_over_source_max:
    "The quoted payment amount is too low for the current DEX rate. Refresh the quote and try again.",
};

export const STELLAR_TRUSTLINE_RESERVE_XLM = 0.5;
