import {
  Asset,
  BASE_FEE,
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { AllowedAsset } from "@/lib/assets/types";
import { assetKey } from "@/lib/assets/types";
import type { Organization } from "@/lib/db/schema";
import { listEnabledPaymentMethods } from "@/lib/payment-methods/service";
import {
  OFFICIAL_ASSETS,
  isOfficialAssetAvailable,
  isOfficialAssetCode,
  resolveOfficialIssuer,
} from "@/lib/payment-methods/official-assets";
import { STELLAR_TRANSACTION_TIMEOUT_SECONDS } from "@/constants/stellar";
import { resolveStellarAsset } from "@/lib/stellar/assets";
import { getHorizonUrl, getNetworkPassphrase } from "@/lib/stellar/network";

export type TrustlineAsset = AllowedAsset & {
  display_name: string;
};

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

export async function getRequiredTrustlineAssets(
  organizationId: string,
  environment: Organization["environment"]
): Promise<TrustlineAsset[]> {
  const assets = new Map<string, TrustlineAsset>();

  for (const official of OFFICIAL_ASSETS) {
    if (official.isNative) {
      continue;
    }

    if (!isOfficialAssetAvailable(official.code, environment)) {
      continue;
    }

    const issuer = resolveOfficialIssuer(official.code, environment);

    if (!issuer) {
      continue;
    }

    const asset: TrustlineAsset = {
      asset_code: official.code,
      issuer_address: issuer,
      display_name: official.displayName,
    };

    assets.set(assetKey(asset), asset);
  }

  const enabledMethods = await listEnabledPaymentMethods(organizationId);

  for (const method of enabledMethods) {
    if (isOfficialAssetCode(method.assetCode)) {
      continue;
    }

    const issuer = method.issuerAddress?.trim();

    if (!issuer) {
      continue;
    }

    const asset: TrustlineAsset = {
      asset_code: method.assetCode,
      issuer_address: issuer,
      display_name: method.displayName,
    };

    assets.set(assetKey(asset), asset);
  }

  return Array.from(assets.values());
}

export async function getMissingTrustlines(
  accountId: string,
  requiredAssets: TrustlineAsset[],
  environment: Organization["environment"]
) {
  const missing: TrustlineAsset[] = [];

  for (const asset of requiredAssets) {
    const stellarAsset = resolveStellarAsset(
      {
        assetCode: asset.asset_code,
        issuerAddress: asset.issuer_address,
      },
      environment
    );

    const hasTrustline = await accountTrustsAsset(
      accountId,
      stellarAsset,
      environment
    );

    if (!hasTrustline) {
      missing.push(asset);
    }
  }

  return missing;
}

export async function buildChangeTrustTransactionXdr(input: {
  sourcePublicKey: string;
  assets: TrustlineAsset[];
  environment: Organization["environment"];
}) {
  if (input.assets.length === 0) {
    throw new Error("No trustlines to add.");
  }

  const server = new Horizon.Server(getHorizonUrl(input.environment));

  let sourceAccount;

  try {
    sourceAccount = await server.loadAccount(input.sourcePublicKey);
  } catch {
    throw new Error(
      "Your wallet account is not funded on this network. Add XLM before adding trustlines."
    );
  }

  const builder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(input.environment),
  });

  for (const asset of input.assets) {
    const stellarAsset = resolveStellarAsset(
      {
        assetCode: asset.asset_code,
        issuerAddress: asset.issuer_address,
      },
      input.environment
    );

    builder.addOperation(
      Operation.changeTrust({
        asset: stellarAsset,
      })
    );
  }

  return builder.setTimeout(STELLAR_TRANSACTION_TIMEOUT_SECONDS).build().toXDR();
}

export async function assertAccountTrustsAsset(input: {
  accountId: string;
  asset: Asset;
  environment: Organization["environment"];
  party: "customer" | "merchant";
}) {
  if (input.asset.isNative()) {
    return;
  }

  const hasTrustline = await accountTrustsAsset(
    input.accountId,
    input.asset,
    input.environment
  );

  if (hasTrustline) {
    return;
  }

  const assetLabel = input.asset.code;

  if (input.party === "customer") {
    throw new Error(
      `Your wallet does not have a ${assetLabel} trustline on this network. Add the trustline in your wallet before paying.`
    );
  }

  throw new Error(
    `The settlement wallet does not have a ${assetLabel} trustline on this network. Add a trustline to the settlement address before accepting ${assetLabel} payments.`
  );
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

  await assertAccountTrustsAsset({
    accountId: input.sourcePublicKey,
    asset: input.asset,
    environment: input.environment,
    party: "customer",
  });

  await assertAccountTrustsAsset({
    accountId: input.destinationPublicKey,
    asset: input.asset,
    environment: input.environment,
    party: "merchant",
  });
}

/** @deprecated Use assertAssetTrustlines */
export const assertUsdcTrustlines = assertAssetTrustlines;
