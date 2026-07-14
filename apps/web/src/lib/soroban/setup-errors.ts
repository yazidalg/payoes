import type { Organization } from "@/lib/db/schema";
import { isSorobanConfigured } from "@/lib/soroban/config";
import { isStellarOperatorConfigured } from "@/lib/stellar/operator";

export type SorobanSetupErrorCode =
  | "soroban_not_configured"
  | "operator_not_configured"
  | "contract_not_initialized"
  | "unauthorized_signer"
  | "payment_not_registered"
  | "payment_already_finalized"
  | "contract_paused"
  | "simulation_failed";

export type SorobanSetupErrorPayload = {
  error: string;
  code: SorobanSetupErrorCode;
  setup: string[];
};

const SETUP_DOC_PATH = "/local-setup/soroban-escrow-setup";

function envPrefix(environment: Organization["environment"]) {
  return environment === "production" ? "MAINNET" : "TESTNET";
}

export function sorobanSetupSteps(
  environment: Organization["environment"],
): string[] {
  const prefix = envPrefix(environment);

  return [
    `Fund a Stellar ${environment === "production" ? "Mainnet" : "Testnet"} account for the Payoes operator.`,
    `Set STELLAR_${prefix}_OPERATOR_SECRET in apps/web/.env.local.`,
    `Set SOROBAN_${prefix}_RPC_URL in apps/web/.env.local.`,
    `Deploy and initialize the Payoes Soroban contract, then set SOROBAN_${prefix}_CONTRACT_ID.`,
    "Ensure the contract authorization_signer matches the operator public key.",
    "Restart npm run dev after changing environment variables.",
    `See ${SETUP_DOC_PATH} for the full setup guide.`,
  ];
}

export function assertSorobanConfigured(
  environment: Organization["environment"],
): void {
  if (!isStellarOperatorConfigured(environment)) {
    throw createSorobanSetupError({
      code: "operator_not_configured",
      environment,
      message: `Stellar operator secret is not configured for ${environment}.`,
    });
  }

  if (!isSorobanConfigured(environment)) {
    throw createSorobanSetupError({
      code: "soroban_not_configured",
      environment,
      message: `Soroban escrow is not configured for ${environment}.`,
    });
  }
}

export function createSorobanSetupError(input: {
  code: SorobanSetupErrorCode;
  environment: Organization["environment"];
  message: string;
  setup?: string[];
}): SorobanSetupError {
  return new SorobanSetupError(
    input.message,
    input.code,
    input.setup ?? sorobanSetupSteps(input.environment),
  );
}

export class SorobanSetupError extends Error {
  readonly code: SorobanSetupErrorCode;
  readonly setup: string[];

  constructor(message: string, code: SorobanSetupErrorCode, setup: string[]) {
    super(message);
    this.name = "SorobanSetupError";
    this.code = code;
    this.setup = setup;
  }

  toJSON(): SorobanSetupErrorPayload {
    return {
      error: this.message,
      code: this.code,
      setup: this.setup,
    };
  }
}

export function classifySorobanSimulationError(
  message: string,
  environment: Organization["environment"],
): SorobanSetupError {
  const normalized = message.toLowerCase();

  if (normalized.includes("notinitialized") || normalized.includes("#2")) {
    return createSorobanSetupError({
      code: "contract_not_initialized",
      environment,
      message:
        "The Payoes Soroban contract is not initialized. Run initialize(admin, authorization_signer, fee_recipient) on the deployed contract.",
      setup: [
        ...sorobanSetupSteps(environment),
        "Initialize the contract with your operator public key as authorization_signer.",
      ],
    });
  }

  if (normalized.includes("unauthorized") || normalized.includes("#3")) {
    return createSorobanSetupError({
      code: "unauthorized_signer",
      environment,
      message:
        "The operator account is not authorized on the Payoes Soroban contract. The contract authorization_signer must match STELLAR_*_OPERATOR_SECRET.",
      setup: [
        ...sorobanSetupSteps(environment),
        "Re-initialize the contract or call set_authorization_signer with the operator public key.",
      ],
    });
  }

  if (
    normalized.includes("paymentnotregistered") ||
    normalized.includes("#7")
  ) {
    return createSorobanSetupError({
      code: "payment_not_registered",
      environment,
      message:
        "This payment is not registered on the Soroban escrow contract. Registration failed before checkout could build a deposit transaction.",
      setup: sorobanSetupSteps(environment),
    });
  }

  if (normalized.includes("paused") || normalized.includes("#4")) {
    return createSorobanSetupError({
      code: "contract_paused",
      environment,
      message: "The Payoes Soroban contract is paused.",
      setup: [
        "Call set_paused(false) on the contract using the admin account.",
        ...sorobanSetupSteps(environment),
      ],
    });
  }

  if (
    normalized.includes("paymentalreadyfinalized") ||
    normalized.includes("#8")
  ) {
    return createSorobanSetupError({
      code: "payment_already_finalized",
      environment,
      message:
        "This payment is already finalized on the Soroban contract. It may have been paid, refunded on-chain, or simulated in sandbox. Open a fresh payment link or create a new payment.",
      setup: [
        "Do not reuse a payment that already completed sandbox simulation.",
        "If a wallet payment was refunded on-chain after underpay, retry from checkout after the app reloads.",
        "Otherwise create a new payment or open the payment link again to start a new checkout session.",
        ...sorobanSetupSteps(environment),
      ],
    });
  }

  return createSorobanSetupError({
    code: "simulation_failed",
    environment,
    message: message || "Soroban escrow simulation failed.",
    setup: [
      ...sorobanSetupSteps(environment),
      "Check server logs for the raw Soroban simulation error.",
    ],
  });
}

export function toSorobanErrorResponse(error: unknown) {
  if (error instanceof SorobanSetupError) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: "simulation_failed" as const,
      setup: [] as string[],
    };
  }

  return {
    error: "Soroban escrow operation failed.",
    code: "simulation_failed" as const,
    setup: [] as string[],
  };
}
