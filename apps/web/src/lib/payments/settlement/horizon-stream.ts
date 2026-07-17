import { Horizon } from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";
import {
  getEscrowConfig,
  isEscrowConfigured,
} from "@/lib/stellar/escrow/config";
import { getHorizonUrl } from "@/lib/stellar/network";
import {
  getHorizonStreamCursor,
  saveHorizonStreamCursor,
} from "@/lib/payments/settlement/horizon-stream-cursors";
import {
  processHorizonEscrowPaymentEvent,
  processPendingEscrowSettlements,
} from "@/lib/payments/settlement/escrow";

type Environment = Organization["environment"];

export type SettlementStreamEnvironmentStatus = {
  connected: boolean;
  lastEventAt: string | null;
  lastError: string | null;
  pagingToken: string | null;
};

const streamStatus: Record<Environment, SettlementStreamEnvironmentStatus> = {
  sandbox: {
    connected: false,
    lastEventAt: null,
    lastError: null,
    pagingToken: null,
  },
  production: {
    connected: false,
    lastEventAt: null,
    lastError: null,
    pagingToken: null,
  },
};

let started = false;
const closeHandlers: Array<() => void> = [];
let settlementDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function isSettlementStreamEnabled() {
  const flag = process.env.ENABLE_SETTLEMENT_STREAM?.trim();

  if (flag === "true") {
    return true;
  }

  if (flag === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

export function getSettlementStreamStatus() {
  return {
    enabled: isSettlementStreamEnabled(),
    environments: { ...streamStatus },
  };
}

function schedulePendingSettlementProcessing() {
  if (settlementDebounceTimer) {
    return;
  }

  settlementDebounceTimer = setTimeout(() => {
    settlementDebounceTimer = null;

    void processPendingEscrowSettlements().catch((error) => {
      console.error("Failed to process pending escrow settlements:", error);
    });
  }, 1000);
}

async function startEnvironmentStream(environment: Environment) {
  if (!isEscrowConfigured(environment)) {
    return;
  }

  try {
    const escrow = getEscrowConfig(environment);
    const cursor = (await getHorizonStreamCursor(environment)) ?? "now";
    const server = new Horizon.Server(getHorizonUrl(environment));

    streamStatus[environment].pagingToken = cursor;

    const close = server
      .payments()
      .forAccount(escrow.publicKey)
      .cursor(cursor)
      .stream({
        onmessage: async (record) => {
          streamStatus[environment].connected = true;
          streamStatus[environment].lastError = null;
          streamStatus[environment].lastEventAt = new Date().toISOString();

          if (record.paging_token) {
            streamStatus[environment].pagingToken = record.paging_token;

            try {
              await saveHorizonStreamCursor(environment, record.paging_token);
            } catch (error) {
              console.error(
                `Failed to persist Horizon cursor (${environment}):`,
                error,
              );
            }
          }

          try {
            const handled = await processHorizonEscrowPaymentEvent(
              environment,
              record,
            );

            if (handled) {
              schedulePendingSettlementProcessing();
            }
          } catch (error) {
            console.error(
              `Horizon stream handler error (${environment}):`,
              error,
            );
          }
        },
        onerror: (error) => {
          streamStatus[environment].connected = false;
          streamStatus[environment].lastError =
            error instanceof Error ? error.message : String(error);
          console.error(`Horizon stream error (${environment}):`, error);
        },
      });

    closeHandlers.push(close);
    streamStatus[environment].connected = true;
  } catch (error) {
    streamStatus[environment].lastError =
      error instanceof Error ? error.message : String(error);
    console.error(`Failed to start Horizon stream (${environment}):`, error);
  }
}

export async function startHorizonSettlementStream() {
  if (started) {
    return;
  }

  started = true;

  try {
    await processPendingEscrowSettlements();
  } catch (error) {
    console.error("Initial escrow settlement pass failed:", error);
  }

  for (const environment of ["sandbox", "production"] as const) {
    void startEnvironmentStream(environment);
  }
}

export function stopHorizonSettlementStream() {
  for (const close of closeHandlers) {
    close();
  }

  closeHandlers.length = 0;
  started = false;

  for (const environment of ["sandbox", "production"] as const) {
    streamStatus[environment].connected = false;
  }
}
