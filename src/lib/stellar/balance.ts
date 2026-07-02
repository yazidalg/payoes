import { NotFoundError } from "@stellar/stellar-sdk";
import { getHorizonServer } from "./horizon";
import { USDC_ASSET_CODE, USDC_ISSUER } from "./network";

export type WalletBalances = {
  xlm: string;
  usdc: string | null;
};

export async function getWalletBalances(
  publicKey: string,
): Promise<WalletBalances> {
  try {
    const account = await getHorizonServer().loadAccount(publicKey);

    const xlm =
      account.balances.find((b) => b.asset_type === "native")?.balance ??
      "0.0000000";

    const usdcEntry = account.balances.find(
      (b) =>
        b.asset_type !== "native" &&
        "asset_code" in b &&
        b.asset_code === USDC_ASSET_CODE &&
        "asset_issuer" in b &&
        b.asset_issuer === USDC_ISSUER,
    );

    const usdc =
      usdcEntry && "balance" in usdcEntry ? usdcEntry.balance : null;

    return { xlm, usdc };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { xlm: "0.0000000", usdc: null };
    }
    throw error;
  }
}
