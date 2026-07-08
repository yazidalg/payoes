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
