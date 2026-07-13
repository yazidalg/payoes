import { createHash } from "node:crypto";
import {
  Asset,
  Address,
  BASE_FEE,
  Contract,
  Horizon,
  Keypair,
  nativeToScVal,
  rpc,
  TransactionBuilder,
  authorizeEntry,
  xdr,
} from "@stellar/stellar-sdk";
import type { AllowedAsset } from "@/lib/assets/types";
import type { Payment } from "@/lib/db/schema";
import { updatePaymentStatus } from "@/lib/payments/service";
import { getNetworkPassphrase, getHorizonUrl } from "@/lib/stellar/network";
import { getSorobanConfig, isSorobanConfigured } from "@/lib/soroban/config";
import { REFUND_REASONS, type RefundReason } from "@/lib/payments/settlement/constants";

function paymentIdHash(payment: Payment) {
  return createHash("sha256").update(payment.publicId).digest();
}

function assetContractId(
  asset: AllowedAsset,
  environment: Payment["environment"]
) {
  const stellarAsset = asset.issuer_address
    ? new Asset(asset.asset_code, asset.issuer_address)
    : Asset.native();

  return stellarAsset.contractId(getNetworkPassphrase(environment));
}

function amountToStroops(amount: string) {
  return BigInt(Math.round(Number(amount) * 10_000_000));
}

function refundReasonCode(reason: RefundReason) {
  switch (reason) {
    case REFUND_REASONS.underpay:
      return 1;
    case REFUND_REASONS.wrong_asset:
      return 2;
    case REFUND_REASONS.expired:
      return 3;
    case REFUND_REASONS.quote_expired:
      return 4;
    case REFUND_REASONS.no_liquidity:
      return 5;
    case REFUND_REASONS.slippage_exceeded:
      return 6;
    case REFUND_REASONS.settle_failed:
      return 7;
    default:
      return 99;
  }
}

async function invokeEscrowContract(
  payment: Payment,
  buildOperation: (contract: Contract) => xdr.Operation
) {
  const config = getSorobanConfig(payment.environment);
  const signer = Keypair.fromSecret(config.authorizationSignerSecret);
  const horizon = new Horizon.Server(getHorizonUrl(payment.environment));
  const account = await horizon.loadAccount(signer.publicKey());
  const contract = new Contract(config.contractId);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(payment.environment),
  })
    .addOperation(buildOperation(contract))
    .setTimeout(60)
    .build();

  const server = new rpc.Server(config.rpcUrl);
  const simulation = await server.simulateTransaction(transaction);

  if (!rpc.Api.isSimulationSuccess(simulation)) {
    throw new Error("Soroban escrow simulation failed");
  }

  const signerAddress = signer.publicKey();
  const validUntilLedgerSeq = simulation.latestLedger + 100;
  const auth = await Promise.all(
    simulation.result?.auth.map(async (entry) => {
      const credentials = entry.credentials();
      const entryAddress =
        credentials.switch().name === "sorobanCredentialsAddress"
          ? Address.fromScAddress(credentials.address().address()).toString()
          : null;

      return entryAddress === signerAddress
        ? authorizeEntry(
            entry,
            signer,
            validUntilLedgerSeq,
            getNetworkPassphrase(payment.environment)
          )
        : entry;
    }) ?? []
  );

  simulation.result!.auth = auth;
  const prepared = rpc.assembleTransaction(transaction, simulation).build();
  prepared.sign(signer);

  return server.sendTransaction(prepared);
}

export async function registerEscrowPaymentOnContract(payment: Payment) {
  const paidAsset: AllowedAsset = {
    asset_code: payment.paidAsset ?? payment.settlementAsset,
    issuer_address: payment.paidAsset
      ? payment.paidAssetIssuer
      : payment.settlementAssetIssuer,
  };
  const settlementAsset: AllowedAsset = {
    asset_code: payment.settlementAsset,
    issuer_address: payment.settlementAssetIssuer,
  };
  const requiredAmount = payment.quotedPaidAmount ?? payment.amount;
  const settlementAmount =
    payment.quotedSettlementAmount ?? payment.merchantSettlementAmount ?? requiredAmount;
  const expiresAt = Math.floor((payment.expiresAt ?? new Date()).getTime() / 1000);

  return invokeEscrowContract(payment, (contract) =>
    contract.call(
      "register_payment",
      xdr.ScVal.scvBytes(paymentIdHash(payment)),
      nativeToScVal(payment.receivingAddress, { type: "address" }),
      nativeToScVal(assetContractId(paidAsset, payment.environment), {
        type: "address",
      }),
      nativeToScVal(amountToStroops(requiredAmount), { type: "i128" }),
      nativeToScVal(assetContractId(settlementAsset, payment.environment), {
        type: "address",
      }),
      nativeToScVal(amountToStroops(settlementAmount), { type: "i128" }),
      nativeToScVal(amountToStroops(payment.platformFeeAmount), { type: "i128" }),
      nativeToScVal(BigInt(expiresAt), { type: "u64" })
    )
  );
}

export async function recordEscrowSettlementOnContract(input: {
  payment: Payment;
  payerAddress: string;
  grossAmount: string;
  merchantAmount: string;
}) {
  return invokeEscrowContract(input.payment, (contract) =>
    contract.call(
      "record_settlement",
      xdr.ScVal.scvBytes(paymentIdHash(input.payment)),
      nativeToScVal(input.payerAddress, { type: "address" }),
      nativeToScVal(amountToStroops(input.grossAmount), { type: "i128" }),
      nativeToScVal(amountToStroops(input.merchantAmount), { type: "i128" })
    )
  );
}

export async function recordEscrowRefundOnContract(input: {
  payment: Payment;
  payerAddress: string;
  amount: string;
  reason: RefundReason;
}) {
  return invokeEscrowContract(input.payment, (contract) =>
    contract.call(
      "record_refund",
      xdr.ScVal.scvBytes(paymentIdHash(input.payment)),
      nativeToScVal(input.payerAddress, { type: "address" }),
      nativeToScVal(amountToStroops(input.amount), { type: "i128" }),
      nativeToScVal(BigInt(refundReasonCode(input.reason)), { type: "u32" })
    )
  );
}

export async function buildEscrowDepositTransaction(input: {
  payment: Payment;
  payerAddress: string;
  amount: string;
}) {
  const config = getSorobanConfig(input.payment.environment);
  const horizon = new Horizon.Server(getHorizonUrl(input.payment.environment));
  const account = await horizon.loadAccount(input.payerAddress);
  const contract = new Contract(config.contractId);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(input.payment.environment),
  })
    .addOperation(
      contract.call(
        "deposit",
        nativeToScVal(input.payerAddress, { type: "address" }),
        xdr.ScVal.scvBytes(paymentIdHash(input.payment)),
        nativeToScVal(amountToStroops(input.amount), { type: "i128" })
      )
    )
    .setTimeout(60)
    .build();

  const server = new rpc.Server(config.rpcUrl);
  const simulation = await server.simulateTransaction(transaction);

  if (!rpc.Api.isSimulationSuccess(simulation)) {
    throw new Error("Soroban escrow deposit simulation failed");
  }

  const signer = Keypair.fromSecret(config.authorizationSignerSecret);
  const signerAddress = signer.publicKey();
  const validUntilLedgerSeq = simulation.latestLedger + 100;
  const auth = await Promise.all(
    simulation.result?.auth.map(async (entry) => {
      const credentials = entry.credentials();
      const entryAddress =
        credentials.switch().name === "sorobanCredentialsAddress"
          ? Address.fromScAddress(credentials.address().address()).toString()
          : null;

      return entryAddress === signerAddress
        ? authorizeEntry(
            entry,
            signer,
            validUntilLedgerSeq,
            getNetworkPassphrase(input.payment.environment)
          )
        : entry;
    }) ?? []
  );

  simulation.result!.auth = auth;
  const prepared = rpc.assembleTransaction(transaction, simulation).build();

  return {
    xdr: prepared.toXDR(),
    contractId: config.contractId,
  };
}

export function canUseEscrowContractDeposit(payment: Payment) {
  const paidAssetCode = payment.paidAsset ?? payment.settlementAsset;
  const paidAssetIssuer = payment.paidAsset
    ? payment.paidAssetIssuer
    : payment.settlementAssetIssuer;

  return (
    paidAssetCode === payment.settlementAsset &&
    (paidAssetIssuer ?? null) === (payment.settlementAssetIssuer ?? null)
  );
}

export async function ensureEscrowPaymentRegistered(payment: Payment) {
  if (payment.paymentFlow !== "escrow" || !isSorobanConfigured(payment.environment)) {
    return;
  }

  try {
    await registerEscrowPaymentOnContract(payment);
  } catch (error) {
    console.error("Failed to register escrow payment on contract:", error);
  }
}

export async function confirmEscrowContractDeposit(input: {
  payment: Payment;
  txHash: string;
  payerAddress: string;
}) {
  const config = getSorobanConfig(input.payment.environment);
  const response = await fetch(config.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: { hash: input.txHash },
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to confirm Soroban escrow transaction");
  }

  const payload = (await response.json()) as {
    error?: { message?: string };
    result?: { status?: string };
  };

  if (payload.error) {
    throw new Error(payload.error.message ?? "Unable to confirm Soroban escrow transaction");
  }

  const status = payload.result?.status;

  if (status !== "SUCCESS") {
    return { completed: false as const, status: status ?? "NOT_FOUND" };
  }

  const payment = await updatePaymentStatus(input.payment, "completed", {
    txHash: input.txHash,
    confirmedAt: new Date(),
    payerAddress: input.payerAddress,
    paidAsset: {
      asset_code: input.payment.settlementAsset,
      issuer_address: input.payment.settlementAssetIssuer,
    },
  });

  return { completed: true as const, payment };
}
