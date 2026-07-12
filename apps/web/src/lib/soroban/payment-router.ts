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
} from "@stellar/stellar-sdk";
import type { Payment } from "@/lib/db/schema";
import { getNetworkPassphrase, getHorizonUrl } from "@/lib/stellar/network";
import { getSorobanPaymentRouterConfig } from "@/lib/soroban/config";
import { updatePaymentStatus } from "@/lib/payments/service";

function paymentIdHash(payment: Payment) {
  return createHash("sha256").update(payment.publicId).digest();
}

function settlementAssetContractId(payment: Payment) {
  const asset = payment.settlementAssetIssuer
    ? new Asset(payment.settlementAsset, payment.settlementAssetIssuer)
    : Asset.native();

  return asset.contractId(getNetworkPassphrase(payment.environment));
}

export async function buildSorobanPaymentTransaction(input: {
  payment: Payment;
  payerAddress: string;
}) {
  const { payment, payerAddress } = input;
  const config = getSorobanPaymentRouterConfig(payment.environment);
  const horizon = new Horizon.Server(getHorizonUrl(payment.environment));
  const account = await horizon.loadAccount(payerAddress);
  const grossAmount = payment.quotedPaidAmount ?? payment.amount;
  const platformFee = payment.platformFeeAmount;
  const contract = new Contract(config.contractId);
  const expiresAt = Math.floor((payment.expiresAt ?? new Date()).getTime() / 1000);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(payment.environment),
  })
    .addOperation(
      contract.call(
        "pay",
        nativeToScVal(payerAddress, { type: "address" }),
        nativeToScVal(paymentIdHash(payment), { type: "bytesN" }),
        nativeToScVal(settlementAssetContractId(payment), { type: "address" }),
        nativeToScVal(BigInt(Math.round(Number(grossAmount) * 10_000_000)), { type: "i128" }),
        nativeToScVal(BigInt(Math.round(Number(platformFee) * 10_000_000)), { type: "i128" }),
        nativeToScVal(payment.receivingAddress, { type: "address" }),
        nativeToScVal(BigInt(expiresAt), { type: "u64" }),
      )
    )
    .setTimeout(60)
    .build();

  const server = new rpc.Server(config.rpcUrl);
  const simulation = await server.simulateTransaction(transaction);

  if (!rpc.Api.isSimulationSuccess(simulation)) {
    throw new Error("Soroban payment simulation failed");
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
            getNetworkPassphrase(payment.environment)
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

export async function submitSorobanPaymentTransaction(input: {
  payment: Payment;
  signedXdr: string;
}) {
  const config = getSorobanPaymentRouterConfig(input.payment.environment);
  const transaction = TransactionBuilder.fromXDR(
    input.signedXdr,
    getNetworkPassphrase(input.payment.environment)
  );
  const server = new rpc.Server(config.rpcUrl);
  return server.sendTransaction(transaction);
}

export async function confirmSorobanPayment(input: {
  payment: Payment;
  txHash: string;
  payerAddress: string;
}) {
  const config = getSorobanPaymentRouterConfig(input.payment.environment);
  const server = new rpc.Server(config.rpcUrl);
  const transaction = await server.getTransaction(input.txHash);

  if (transaction.status !== "SUCCESS") {
    return { completed: false as const, status: transaction.status };
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
