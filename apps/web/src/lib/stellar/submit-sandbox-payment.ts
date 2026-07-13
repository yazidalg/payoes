import {
  Horizon,
  Networks,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { Payment } from "@/lib/db/schema";
import type { AllowedAsset } from "@/lib/assets/types";
import { applySendMaxBuffer, assetsMatch } from "@/lib/pricing/quotes";
import { getHorizonUrl } from "@/lib/stellar/network";
import { getStellarOperatorKeypair } from "@/lib/stellar/operator";
import {
  buildPathPaymentStrictReceiveXdr,
  buildPaymentTransactionXdr,
} from "@/lib/stellar/payments";

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

  const paidAssetCode = payment.paidAsset ?? payment.settlementAsset;
  const paidAssetIssuer = payment.paidAsset
    ? payment.paidAssetIssuer
    : payment.settlementAssetIssuer;

  const paidAsset: AllowedAsset = {
    asset_code: paidAssetCode,
    issuer_address: paidAssetIssuer,
  };

  const settlementAsset: AllowedAsset = {
    asset_code: payment.settlementAsset,
    issuer_address: payment.settlementAssetIssuer,
  };

  const keypair = getStellarOperatorKeypair("sandbox");
  await ensureTestnetAccountFunded(keypair.publicKey());

  const amount = payment.quotedPaidAmount ?? payment.amount;
  const destinationPublicKey =
    payment.paymentFlow === "escrow" && payment.depositAddress
      ? payment.depositAddress
      : payment.receivingAddress;
  const requiresPathPayment =
    payment.paymentFlow !== "escrow" &&
    Boolean(payment.quotedSettlementAmount) &&
    !assetsMatch(paidAsset, settlementAsset);

  const xdr = requiresPathPayment
    ? await buildPathPaymentStrictReceiveXdr({
        sourcePublicKey: keypair.publicKey(),
        destinationPublicKey,
        sendAsset: {
          assetCode: paidAsset.asset_code,
          issuerAddress: paidAsset.issuer_address,
        },
        sendMax: applySendMaxBuffer(amount),
        destAsset: {
          assetCode: settlementAsset.asset_code,
          issuerAddress: settlementAsset.issuer_address,
        },
        destAmount: payment.quotedSettlementAmount!,
        environment: payment.environment,
        memo: payment.memo,
      })
    : await buildPaymentTransactionXdr({
        sourcePublicKey: keypair.publicKey(),
        destinationPublicKey,
        amount,
        asset: {
          assetCode: paidAsset.asset_code,
          issuerAddress: paidAsset.issuer_address,
        },
        environment: payment.environment,
        memo: payment.memo,
      });

  const server = new Horizon.Server(getHorizonUrl(payment.environment));
  const transaction = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  transaction.sign(keypair);
  const submitResult = await server.submitTransaction(transaction);

  return {
    txHash: submitResult.hash,
    payerAddress: keypair.publicKey(),
  };
}
