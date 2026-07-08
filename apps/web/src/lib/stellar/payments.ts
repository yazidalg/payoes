import {
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";
import {
  STELLAR_MEMO_MAX_LENGTH,
  STELLAR_TRANSACTION_TIMEOUT_SECONDS,
} from "@/constants/stellar";
import { resolveStellarAsset, type PaymentAssetInput } from "@/lib/stellar/assets";
import { normalizeStellarAmount } from "@/lib/stellar/amount";
import {
  amountsWithinSlippage,
  applySendMaxBuffer,
  DEFAULT_SLIPPAGE_BPS,
} from "@/lib/pricing/quotes";
import { getHorizonUrl, getNetworkPassphrase } from "@/lib/stellar/network";
import { assertAccountTrustsAsset, assertAssetTrustlines } from "@/lib/stellar/trustlines";

export function getAssetCode(
  asset: PaymentAssetInput,
  environment: Organization["environment"]
) {
  return resolveStellarAsset(asset, environment);
}

export async function buildPaymentTransactionXdr(input: {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  asset: PaymentAssetInput;
  environment: Organization["environment"];
  memo?: string | null;
}) {
  const server = new Horizon.Server(getHorizonUrl(input.environment));
  const sourceAccount = await server.loadAccount(input.sourcePublicKey);
  const stellarAsset = getAssetCode(input.asset, input.environment);

  await assertAssetTrustlines({
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
    .setTimeout(STELLAR_TRANSACTION_TIMEOUT_SECONDS);

  if (input.memo) {
    transaction.addMemo(Memo.text(input.memo.slice(0, STELLAR_MEMO_MAX_LENGTH)));
  }

  return transaction.build().toXDR();
}

type HorizonPathNode = {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
};

function horizonPathToAssets(path: HorizonPathNode[]) {
  return path.map((node) => {
    if (node.asset_type === "native") {
      return Asset.native();
    }

    if (!node.asset_code || !node.asset_issuer) {
      throw new Error("Invalid liquidity path returned by Horizon");
    }

    return new Asset(node.asset_code, node.asset_issuer);
  });
}

function resolveSendMaxForPath(sendMax: string, pathSourceAmount: string) {
  const bufferedPathAmount = applySendMaxBuffer(pathSourceAmount);
  const sendMaxNumeric = Number(sendMax);
  const bufferedPathNumeric = Number(bufferedPathAmount);

  if (
    !Number.isFinite(sendMaxNumeric) ||
    !Number.isFinite(bufferedPathNumeric)
  ) {
    throw new Error("Invalid amounts for path payment");
  }

  if (sendMaxNumeric >= bufferedPathNumeric) {
    return sendMax;
  }

  return normalizeStellarAmount(bufferedPathAmount);
}

export async function buildPathPaymentStrictReceiveXdr(input: {
  sourcePublicKey: string;
  destinationPublicKey: string;
  sendAsset: PaymentAssetInput;
  sendMax: string;
  destAsset: PaymentAssetInput;
  destAmount: string;
  environment: Organization["environment"];
  memo?: string | null;
}) {
  const server = new Horizon.Server(getHorizonUrl(input.environment));
  const sourceAccount = await server.loadAccount(input.sourcePublicKey);
  const sendStellarAsset = getAssetCode(input.sendAsset, input.environment);
  const destStellarAsset = getAssetCode(input.destAsset, input.environment);

  await assertAccountTrustsAsset({
    accountId: input.sourcePublicKey,
    asset: sendStellarAsset,
    environment: input.environment,
    party: "customer",
  });

  await assertAccountTrustsAsset({
    accountId: input.destinationPublicKey,
    asset: destStellarAsset,
    environment: input.environment,
    party: "merchant",
  });

  const paths = await server
    .strictReceivePaths([sendStellarAsset], destStellarAsset, input.destAmount)
    .call();

  if (!paths.records.length) {
    throw new Error(
      `No liquidity path from ${input.sendAsset.assetCode} to ${input.destAsset.assetCode} on this network. Try another payment asset or ask the merchant to settle in ${input.sendAsset.assetCode}.`
    );
  }

  const bestPath = paths.records[0] as {
    source_amount: string;
    path?: HorizonPathNode[];
  };
  const pathAssets = horizonPathToAssets(bestPath.path ?? []);
  const sendMax = resolveSendMaxForPath(input.sendMax, bestPath.source_amount);

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(input.environment),
  })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: sendStellarAsset,
        sendMax,
        destination: input.destinationPublicKey,
        destAsset: destStellarAsset,
        destAmount: input.destAmount,
        path: pathAssets,
      })
    )
    .setTimeout(STELLAR_TRANSACTION_TIMEOUT_SECONDS);

  if (input.memo) {
    transaction.addMemo(Memo.text(input.memo.slice(0, STELLAR_MEMO_MAX_LENGTH)));
  }

  return transaction.build().toXDR();
}

function getAssetIdentifier(
  asset: PaymentAssetInput,
  environment: Organization["environment"]
) {
  const stellarAsset = getAssetCode(asset, environment);
  return stellarAsset.isNative()
    ? "native"
    : `${stellarAsset.code}:${stellarAsset.issuer}`;
}

export async function verifyPaymentOnHorizon(input: {
  txHash: string;
  destination: string;
  amount: string;
  asset: PaymentAssetInput;
  environment: Organization["environment"];
  memo?: string | null;
  slippageBps?: number;
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

  const expectedAsset = getAssetIdentifier(input.asset, input.environment);

  if (transaction.successful !== true) {
    return { valid: false as const, reason: "Transaction was not successful" };
  }

  const paymentOp = operations.records.find((record) => record.type === "payment");

  if (!paymentOp) {
    return { valid: false as const, reason: "Payment operation not found" };
  }

  const payment = paymentOp as {
    from: string;
    from_muxed?: string;
    to: string;
    to_muxed?: string;
    amount: string;
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
  };

  const payerAddress = payment.from_muxed ?? payment.from;

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

  const slippageBps = input.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const amountMatches = input.slippageBps !== undefined
    ? amountsWithinSlippage(input.amount, payment.amount, slippageBps)
    : payment.amount === input.amount;

  if (!amountMatches) {
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

  return { valid: true as const, transaction, payerAddress };
}

export async function verifyPathPaymentStrictReceiveOnHorizon(input: {
  txHash: string;
  destination: string;
  destAmount: string;
  destAsset: PaymentAssetInput;
  environment: Organization["environment"];
  slippageBps?: number;
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

  const expectedDestAsset = getAssetIdentifier(input.destAsset, input.environment);

  if (transaction.successful !== true) {
    return { valid: false as const, reason: "Transaction was not successful" };
  }

  const pathOp = operations.records.find(
    (record) => record.type === "path_payment_strict_receive"
  );

  if (!pathOp) {
    return { valid: false as const, reason: "Path payment operation not found" };
  }

  const pathPayment = pathOp as {
    from: string;
    from_muxed?: string;
    to: string;
    to_muxed?: string;
    amount: string;
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
    source_asset_type: string;
    source_asset_code?: string;
    source_asset_issuer?: string;
  };

  const payerAddress = pathPayment.from_muxed ?? pathPayment.from;
  const actualDestAsset =
    pathPayment.asset_type === "native"
      ? "native"
      : `${pathPayment.asset_code}:${pathPayment.asset_issuer}`;

  const destinationMatches =
    pathPayment.to === input.destination ||
    pathPayment.to_muxed === input.destination;

  if (!destinationMatches) {
    return {
      valid: false as const,
      reason: "Payment was sent to a different address than the merchant wallet",
    };
  }

  const slippageBps = input.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const amountMatches = amountsWithinSlippage(
    input.destAmount,
    pathPayment.amount,
    slippageBps
  );

  if (!amountMatches) {
    return {
      valid: false as const,
      reason: `Settlement amount does not match (expected ${input.destAmount}, received ${pathPayment.amount})`,
    };
  }

  if (actualDestAsset !== expectedDestAsset) {
    return {
      valid: false as const,
      reason: "Settlement asset does not match",
    };
  }

  const paidAssetCode =
    pathPayment.source_asset_type === "native"
      ? "XLM"
      : pathPayment.source_asset_code ?? "XLM";
  const paidAssetIssuer =
    pathPayment.source_asset_type === "native"
      ? null
      : pathPayment.source_asset_issuer ?? null;

  return {
    valid: true as const,
    transaction,
    payerAddress,
    paidAsset: {
      asset_code: paidAssetCode,
      issuer_address: paidAssetIssuer,
    },
  };
}
