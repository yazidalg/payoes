import {
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";
import type { AcceptedAsset } from "@/lib/organizations/wallet-constants";
import {
  STELLAR_MAINNET_USDC_ISSUER,
  STELLAR_TESTNET_USDC_ISSUER,
} from "@/lib/stellar/env";
import { stellarAmountsEqual } from "@/lib/stellar/amount";
import { getHorizonUrl, getNetworkPassphrase } from "@/lib/stellar/network";
import { assertUsdcTrustlines } from "@/lib/stellar/trustlines";

export function getAssetCode(
  asset: AcceptedAsset,
  environment: Organization["environment"]
) {
  if (asset === "XLM") {
    return Asset.native();
  }

  const issuer =
    environment === "production"
      ? STELLAR_MAINNET_USDC_ISSUER
      : STELLAR_TESTNET_USDC_ISSUER;

  return new Asset("USDC", issuer);
}

export async function buildPaymentTransactionXdr(input: {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  asset: AcceptedAsset;
  environment: Organization["environment"];
  memo?: string | null;
}) {
  const server = new Horizon.Server(getHorizonUrl(input.environment));
  const sourceAccount = await server.loadAccount(input.sourcePublicKey);
  const stellarAsset = getAssetCode(input.asset, input.environment);

  await assertUsdcTrustlines({
    sourcePublicKey: input.sourcePublicKey,
    destinationPublicKey: input.destinationPublicKey,
    asset: stellarAsset,
    environment: input.environment,
  });

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(input.environment),
  })
    .addOperation(
      Operation.payment({
        destination: input.destinationPublicKey,
        asset: stellarAsset,
        amount: input.amount,
      })
    )
    .setTimeout(300);

  if (input.memo) {
    transaction.addMemo(Memo.text(input.memo.slice(0, 28)));
  }

  return transaction.build().toXDR();
}

export async function verifyPaymentOnHorizon(input: {
  txHash: string;
  destination: string;
  amount: string;
  asset: AcceptedAsset;
  environment: Organization["environment"];
  memo?: string | null;
}) {
  const server = new Horizon.Server(getHorizonUrl(input.environment));
  const transaction = await server
    .transactions()
    .transaction(input.txHash)
    .call();
  const operations = await server
    .operations()
    .forTransaction(input.txHash)
    .limit(10)
    .call();

  const stellarAsset = getAssetCode(input.asset, input.environment);
  const expectedAsset = stellarAsset.isNative()
    ? "native"
    : `${stellarAsset.code}:${stellarAsset.issuer}`;

  if (transaction.successful !== true) {
    return { valid: false as const, reason: "Transaction was not successful" };
  }

  const paymentOp = operations.records.find((record) => record.type === "payment");

  if (!paymentOp) {
    return { valid: false as const, reason: "Payment operation not found" };
  }

  const payment = paymentOp as {
    to: string;
    to_muxed?: string;
    amount: string;
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
  };

  const actualAsset =
    payment.asset_type === "native"
      ? "native"
      : `${payment.asset_code}:${payment.asset_issuer}`;

  const destinationMatches =
    payment.to === input.destination ||
    payment.to_muxed === input.destination;

  if (!destinationMatches) {
    return {
      valid: false as const,
      reason: "Payment was sent to a different address than the merchant wallet",
    };
  }

  if (!stellarAmountsEqual(payment.amount, input.amount)) {
    return {
      valid: false as const,
      reason: `Payment amount does not match (expected ${input.amount}, received ${payment.amount})`,
    };
  }

  if (actualAsset !== expectedAsset) {
    return {
      valid: false as const,
      reason: "Payment asset does not match",
    };
  }

  return { valid: true as const, transaction };
}
