import { rpc } from "@stellar/stellar-sdk";

export function getSorobanSimulationErrorMessage(
  simulation: rpc.Api.SimulateTransactionResponse,
  fallback: string,
) {
  if (rpc.Api.isSimulationError(simulation)) {
    return simulation.error ?? fallback;
  }

  if ("error" in simulation && typeof simulation.error === "string") {
    return simulation.error;
  }

  return fallback;
}
