import type { Organization } from "@/lib/db/schema";
import { isStellarTransactionHash } from "@/lib/stellar/transaction-hash";

export function getStellarExpertTxUrl(
  txHash: string,
  environment: Organization["environment"],
) {
  const network = environment === "production" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
}

export function getStellarExpertTxUrlIfValid(
  txHash: string | null | undefined,
  environment: Organization["environment"],
) {
  if (!isStellarTransactionHash(txHash)) {
    return null;
  }

  return getStellarExpertTxUrl(txHash, environment);
}
