import "server-only";

import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
  type Transaction,
} from "@stellar/stellar-sdk";
import { getHorizonServer } from "./horizon";
import type { StablecoinDefinition } from "./stablecoins";

const DEFAULT_TRUST_LIMIT = "1000000";

export async function buildChangeTrustTransaction(
  publicKey: string,
  stablecoin: StablecoinDefinition,
): Promise<Transaction> {
  const account = await getHorizonServer().loadAccount(publicKey);
  const asset = new Asset(stablecoin.code, stablecoin.issuer);

  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset,
        limit: DEFAULT_TRUST_LIMIT,
      }),
    )
    .setTimeout(180)
    .build();
}

export async function submitSignedTransaction(transaction: Transaction) {
  const response = await getHorizonServer().submitTransaction(transaction);

  if (!response.successful) {
    throw new Error(
      `Trustline transaction failed: ${JSON.stringify(response)}`,
    );
  }

  return response;
}
