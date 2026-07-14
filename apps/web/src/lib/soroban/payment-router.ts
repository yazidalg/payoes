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
import type { Payment } from "@/lib/db/schema";
import { getNetworkPassphrase, getHorizonUrl } from "@/lib/stellar/network";
import { getSorobanConfig } from "@/lib/soroban/config";
import {
  submitSorobanTransaction,
  waitForSorobanTransaction,
} from "@/lib/soroban/transaction";
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
  const config = getSorobanConfig(payment.environment);
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
        xdr.ScVal.scvBytes(paymentIdHash(payment)),
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
  const config = getSorobanConfig(input.payment.environment);
  const transaction = TransactionBuilder.fromXDR(
    input.signedXdr,
    getNetworkPassphrase(input.payment.environment),
  );
  const server = new rpc.Server(config.rpcUrl);
  return submitSorobanTransaction(server, transaction);
}

export async function confirmSorobanPayment(input: {
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
    throw new Error("Unable to confirm Soroban transaction");
  }

  const payload = (await response.json()) as {
    error?: { message?: string };
    result?: { status?: string };
  };

  if (payload.error) {
    throw new Error(payload.error.message ?? "Unable to confirm Soroban transaction");
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
