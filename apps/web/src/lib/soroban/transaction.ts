import { rpc, xdr } from "@stellar/stellar-sdk";

const TX_RESULT_MESSAGES: Record<string, string> = {
  txBadAuth:
    "The transaction signature or Soroban authorization is invalid. Reconnect your wallet and try again.",
  txInsufficientBalance:
    "Insufficient balance. Make sure your wallet has enough XLM for fees and enough of the payment asset.",
  txInsufficientFee:
    "The transaction fee is too low. Refresh checkout and try again.",
  txTooLate:
    "The transaction expired before it was submitted. Refresh checkout and try again.",
  txBadSeq:
    "Your wallet sequence number is out of date. Refresh the page and try again.",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatSorobanSendTransactionError(
  result: rpc.Api.SendTransactionResponse,
) {
  if (result.errorResult) {
    const txCode = result.errorResult.result().switch().name;

    if (TX_RESULT_MESSAGES[txCode]) {
      return TX_RESULT_MESSAGES[txCode];
    }

    if (txCode === "txFailed") {
      const operationResults = result.errorResult.result().results() ?? [];

      for (const operationResult of operationResults) {
        if (operationResult.switch().name !== "opInner") {
          continue;
        }

        const inner = operationResult.tr();
        if (inner.switch().name === "invokeHostFunction") {
          return "The Soroban contract rejected this payment. Refresh checkout and try again with a new payment link if the issue persists.";
        }
      }
    }
  }

  const diagnosticMessage = formatDiagnosticEvents(result.diagnosticEvents);
  if (diagnosticMessage) {
    return diagnosticMessage;
  }

  return "Soroban transaction was rejected by the network.";
}

function formatDiagnosticEvents(events: xdr.DiagnosticEvent[] | undefined) {
  if (!events?.length) {
    return null;
  }

  const serialized = events
    .map((event) => {
      try {
        return JSON.stringify(event);
      } catch {
        return event.toXDR("base64");
      }
    })
    .join(" ");

  if (serialized.includes("Error(Contract")) {
    return serialized.match(/Error\(Contract[^)]*\)/)?.[0] ?? serialized;
  }

  if (serialized.toLowerCase().includes("insufficient balance")) {
    return "Insufficient balance. Fund your wallet with enough XLM for fees and the payment asset.";
  }

  if (serialized.toLowerCase().includes("trustline")) {
    return "A trustline for this asset is missing in your wallet.";
  }

  return null;
}

export async function waitForSorobanTransaction(
  rpcUrl: string,
  hash: string,
  options?: { maxAttempts?: number; delayMs?: number },
) {
  const maxAttempts = options?.maxAttempts ?? 30;
  const delayMs = options?.delayMs ?? 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: { hash },
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to confirm Soroban transaction status");
    }

    const payload = (await response.json()) as {
      result?: { status?: string };
    };

    const status = payload.result?.status;

    if (status === "SUCCESS") {
      return;
    }

    if (status === "FAILED") {
      throw new Error("Soroban transaction failed on the network.");
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  throw new Error("Soroban transaction confirmation timed out. Try again in a moment.");
}

export async function submitSorobanTransaction(
  server: rpc.Server,
  transaction: Parameters<rpc.Server["sendTransaction"]>[0],
  options?: { retries?: number },
) {
  const retries = options?.retries ?? 4;
  let lastResult: rpc.Api.SendTransactionResponse | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const result = await server.sendTransaction(transaction);
    lastResult = result;

    if (result.status === "PENDING" || result.status === "DUPLICATE") {
      return result;
    }

    if (result.status === "TRY_AGAIN_LATER" && attempt < retries) {
      await sleep(1000);
      continue;
    }

    break;
  }

  if (!lastResult) {
    throw new Error("Soroban transaction was rejected by the network.");
  }

  if (lastResult.status === "ERROR") {
    throw new Error(formatSorobanSendTransactionError(lastResult));
  }

  if (lastResult.status === "TRY_AGAIN_LATER") {
    throw new Error(
      "The Stellar network is busy. Wait a few seconds and try again.",
    );
  }

  return lastResult;
}
