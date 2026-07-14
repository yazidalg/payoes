import { STELLAR_OPERATION_ERROR_MESSAGES } from "@/constants/stellar";

export type HorizonErrorPayload = {
  extras?: {
    result_codes?: {
      transaction?: string;
      operations?: string[];
    };
  };
};

export function formatHorizonSubmitError(error: unknown): string {
  const response = (error as { response?: { data?: HorizonErrorPayload } })
    ?.response?.data;
  const operationCode = response?.extras?.result_codes?.operations?.[0];

  if (operationCode && STELLAR_OPERATION_ERROR_MESSAGES[operationCode]) {
    return STELLAR_OPERATION_ERROR_MESSAGES[operationCode];
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Transaction failed when submitted to the Stellar network.";
}

export function isLiquiditySettlementError(error: unknown): boolean {
  const raw =
    error instanceof Error ? error.message : formatHorizonSubmitError(error);
  const formatted = formatHorizonSubmitError(error);
  const combined = `${raw} ${formatted}`.toLowerCase();

  return (
    combined.includes("no liquidity path") ||
    combined.includes("not enough liquidity") ||
    combined.includes("too few offers") ||
    combined.includes("op_too_few_offers") ||
    combined.includes("liquidity")
  );
}

export function isEscrowDepositAlreadyReleasedError(error: unknown): boolean {
  const message = (
    error instanceof Error ? error.message : formatHorizonSubmitError(error)
  ).toLowerCase();

  return (
    message.includes("invalidamount") ||
    message.includes("#5") ||
    message.includes("insufficient balance")
  );
}
