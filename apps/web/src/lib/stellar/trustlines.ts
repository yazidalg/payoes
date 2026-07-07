import { Horizon, type Asset } from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";
import { getHorizonUrl } from "@/lib/stellar/network";

export async function accountTrustsAsset(
  accountId: string,
  asset: Asset,
  environment: Organization["environment"]
) {
  if (asset.isNative()) {
    return true;
  }

  const server = new Horizon.Server(getHorizonUrl(environment));

  try {
    const account = await server.loadAccount(accountId);
    return account.balances.some((balance) => {
      if (
        balance.asset_type !== "credit_alphanum4" &&
        balance.asset_type !== "credit_alphanum12"
      ) {
        return false;
      }

      return (
        balance.asset_code === asset.code &&
        balance.asset_issuer === asset.issuer
      );
    });
  } catch {
    return false;
  }
}

export async function assertUsdcTrustlines(input: {
  sourcePublicKey: string;
  destinationPublicKey: string;
  asset: Asset;
  environment: Organization["environment"];
}) {
  if (input.asset.isNative()) {
    return;
  }

  const [sourceTrusts, destinationTrusts] = await Promise.all([
    accountTrustsAsset(input.sourcePublicKey, input.asset, input.environment),
    accountTrustsAsset(
      input.destinationPublicKey,
      input.asset,
      input.environment
    ),
  ]);

  if (!sourceTrusts) {
    throw new Error(
      "Your wallet does not have a USDC trustline on this network. Add a USDC trustline in your wallet, then fund it from the Circle testnet faucet."
    );
  }

  if (!destinationTrusts) {
    throw new Error(
      "The merchant receiving wallet does not have a USDC trustline on this network. The merchant must add a USDC trustline to their receiving address before accepting USDC payments."
    );
  }
}
