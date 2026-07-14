import { Horizon, TransactionBuilder } from "@stellar/stellar-sdk";
import type { Payment } from "@/lib/db/schema";
import { processEscrowSettlement } from "@/lib/payments/settlement/escrow";
import { getNetworkPassphrase, getHorizonUrl } from "@/lib/stellar/network";
import { getStellarOperatorKeypair } from "@/lib/stellar/operator";
import {
  buildEscrowDepositTransaction,
  confirmEscrowContractDeposit,
  registerEscrowPaymentOnContract,
} from "@/lib/soroban/escrow-contract";
import { submitSorobanPaymentTransaction } from "@/lib/soroban/payment-router";

const FRIENDBOT_URL = "https://friendbot.stellar.org";

async function ensureTestnetAccountFunded(publicKey: string) {
  const server = new Horizon.Server(getHorizonUrl("sandbox"));

  try {
    await server.loadAccount(publicKey);
    return;
  } catch (error) {
    const notFound =
      error instanceof Error &&
      ("response" in error
        ? (error as { response?: { status?: number } }).response?.status === 404
        : error.message.includes("404"));

    if (!notFound) {
      throw error;
    }
  }

  const response = await fetch(
    `${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`,
  );

  if (!response.ok) {
    throw new Error("Unable to fund sandbox simulation account on testnet");
  }
}

export async function submitSandboxPaymentTransaction(payment: Payment) {
  if (payment.environment !== "sandbox") {
    throw new Error("Sandbox simulation is only available in sandbox mode");
  }

  const keypair = getStellarOperatorKeypair("sandbox");
  await ensureTestnetAccountFunded(keypair.publicKey());

  const amount = payment.quotedPaidAmount ?? payment.amount;

  await registerEscrowPaymentOnContract(payment);
  const built = await buildEscrowDepositTransaction({
    payment,
    payerAddress: keypair.publicKey(),
    amount,
  });

  const transaction = TransactionBuilder.fromXDR(
    built.xdr,
    getNetworkPassphrase(payment.environment),
  );
  transaction.sign(keypair);

  const submitResult = await submitSorobanPaymentTransaction({
    payment,
    signedXdr: transaction.toXDR(),
  });

  if (!submitResult.hash) {
    throw new Error("Sandbox Soroban escrow deposit was rejected");
  }

  const confirmResult = await confirmEscrowContractDeposit({
    payment,
    txHash: submitResult.hash,
    payerAddress: keypair.publicKey(),
    amount,
  });

  if (!confirmResult.completed) {
    throw new Error("Sandbox Soroban escrow deposit is still processing");
  }

  void processEscrowSettlement(confirmResult.payment).catch((error) => {
    console.error("Merchant settlement failed after sandbox deposit:", error);
  });

  return {
    txHash: submitResult.hash,
    payerAddress: keypair.publicKey(),
    payment: confirmResult.payment,
  };
}
