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

export async function assertAssetTrustlines(input: {
  sourcePublicKey: string;
  destinationPublicKey: string;
  asset: Asset;
  environment: Organization["environment"];
}) {
  if (input.asset.isNative()) {
    return;
  }

  const assetLabel = input.asset.code;

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
      `Your wallet does not have a ${assetLabel} trustline on this network. Add the trustline in your wallet before paying.`
    );
  }

  if (!destinationTrusts) {
    throw new Error(
      `The merchant receiving wallet does not have a ${assetLabel} trustline on this network. The merchant must add a trustline to their receiving address before accepting ${assetLabel} payments.`
    );
  }
}

/** @deprecated Use assertAssetTrustlines */
export const assertUsdcTrustlines = assertAssetTrustlines;
