import type { Organization } from "@/lib/db/schema";
import { getHorizonUrl } from "@/lib/stellar/network";

export function getStellarExpertTxUrl(
  txHash: string,
  environment: Organization["environment"]
) {
  const network = environment === "production" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
}
