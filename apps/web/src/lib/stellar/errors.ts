type HorizonErrorPayload = {
  extras?: {
    result_codes?: {
      transaction?: string;
      operations?: string[];
    };
  };
};

const OPERATION_ERROR_MESSAGES: Record<string, string> = {
  op_no_trust:
    "A USDC trustline is missing. The customer wallet or merchant receiving wallet must add a trustline for USDC on this network before paying.",
  op_underfunded:
    "Insufficient balance. Make sure your wallet has enough USDC (or XLM for native payments) to complete this payment.",
  op_line_full:
    "The destination account cannot receive more of this asset. The merchant may need to adjust their trustline limit.",
};

export function formatHorizonSubmitError(error: unknown): string {
  const response = (error as { response?: { data?: HorizonErrorPayload } })
    ?.response?.data;
  const operationCode = response?.extras?.result_codes?.operations?.[0];

  if (operationCode && OPERATION_ERROR_MESSAGES[operationCode]) {
    return OPERATION_ERROR_MESSAGES[operationCode];
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Transaction failed when submitted to the Stellar network.";
}
