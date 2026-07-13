import {
  Horizon,
  Keypair,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";
import { getNetworkPassphrase, getHorizonUrl } from "@/lib/stellar/network";
import { buildPathPaymentStrictReceiveXdr, buildPaymentTransactionXdr } from "@/lib/stellar/payments";
import type { PaymentAssetInput } from "@/lib/stellar/assets";

export async function submitEscrowSignedXdr(input: {
  signedXdr: string;
  environment: Organization["environment"];
}) {
  const server = new Horizon.Server(getHorizonUrl(input.environment));
  const transaction = TransactionBuilder.fromXDR(
    input.signedXdr,
    getNetworkPassphrase(input.environment)
  );

  return server.submitTransaction(transaction);
}

export async function submitEscrowPayment(input: {
  keypair: Keypair;
  destinationPublicKey: string;
  amount: string;
  asset: PaymentAssetInput;
  environment: Organization["environment"];
  memo?: string | null;
}) {
  const xdr = await buildPaymentTransactionXdr({
    sourcePublicKey: input.keypair.publicKey(),
    destinationPublicKey: input.destinationPublicKey,
    amount: input.amount,
    asset: input.asset,
    environment: input.environment,
    memo: input.memo,
  });

  const transaction = TransactionBuilder.fromXDR(
    xdr,
    getNetworkPassphrase(input.environment)
  );
  transaction.sign(input.keypair);

  return submitEscrowSignedXdr({
    signedXdr: transaction.toXDR(),
    environment: input.environment,
  });
}

export async function submitEscrowPathPayment(input: {
  keypair: Keypair;
  destinationPublicKey: string;
  sendAsset: PaymentAssetInput;
  sendMax: string;
  destAsset: PaymentAssetInput;
  destAmount: string;
  environment: Organization["environment"];
  memo?: string | null;
}) {
  const xdr = await buildPathPaymentStrictReceiveXdr({
    sourcePublicKey: input.keypair.publicKey(),
    destinationPublicKey: input.destinationPublicKey,
    sendAsset: input.sendAsset,
    sendMax: input.sendMax,
    destAsset: input.destAsset,
    destAmount: input.destAmount,
    environment: input.environment,
    memo: input.memo,
  });

  const transaction = TransactionBuilder.fromXDR(
    xdr,
    getNetworkPassphrase(input.environment)
  );
  transaction.sign(input.keypair);

  return submitEscrowSignedXdr({
    signedXdr: transaction.toXDR(),
    environment: input.environment,
  });
}
