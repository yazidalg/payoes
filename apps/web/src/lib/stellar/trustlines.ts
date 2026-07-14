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
import { DEFAULT_ORGANIZATION_ASSET_CODES } from "@/constants/assets/official";
import {
  listEnabledPaymentMethods,
  listPaymentMethods,
  type PaymentMethod,
} from "@/lib/payment-methods/service";
import {
  isOfficialAssetAvailable,
  isOfficialAssetCode,
  resolveOfficialIssuer,
  getOfficialAsset,
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

export function buildTrustlineAssetsFromMethods(
  methods: PaymentMethod[],
  environment: Organization["environment"],
): TrustlineAsset[] {
  const assets = new Map<string, TrustlineAsset>();

  for (const method of methods) {
    const official = getOfficialAsset(method.assetCode);

    if (official?.isNative) {
      continue;
    }

    let issuer: string | null = null;

    if (isOfficialAssetCode(method.assetCode)) {
      if (!isOfficialAssetAvailable(method.assetCode, environment)) {
        continue;
      }

      issuer = resolveOfficialIssuer(method.assetCode, environment);
    } else {
      issuer = method.issuerAddress?.trim() || null;
    }

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

export async function getRequiredTrustlineAssets(
  organizationId: string,
  environment: Organization["environment"]
): Promise<TrustlineAsset[]> {
  const enabledMethods = await listEnabledPaymentMethods(organizationId);
  return buildTrustlineAssetsFromMethods(enabledMethods, environment);
}

export async function getRequiredTrustlineAssetsForMethodIds(
  organizationId: string,
  methodIds: string[],
  environment: Organization["environment"],
): Promise<TrustlineAsset[]> {
  const methods = await listPaymentMethods(organizationId);
  const selectedIds = new Set(methodIds);

  return buildTrustlineAssetsFromMethods(
    methods.filter((method) => selectedIds.has(method.id)),
    environment,
  );
}

function trustlineAssetFromCode(
  assetCode: string,
  displayName: string,
  environment: Organization["environment"],
) {
  const official = getOfficialAsset(assetCode);

  if (official?.isNative) {
    return null;
  }

  let issuer: string | null = null;

  if (isOfficialAssetCode(assetCode)) {
    if (!isOfficialAssetAvailable(assetCode, environment)) {
      return null;
    }

    issuer = resolveOfficialIssuer(assetCode, environment);
  }

  if (!issuer) {
    return null;
  }

  return {
    asset_code: assetCode,
    issuer_address: issuer,
    display_name: displayName,
  } satisfies TrustlineAsset;
}

export function getDefaultRequiredTrustlineAssets(
  environment: Organization["environment"],
): TrustlineAsset[] {
  const assets = new Map<string, TrustlineAsset>();

  for (const assetCode of DEFAULT_ORGANIZATION_ASSET_CODES) {
    const official = getOfficialAsset(assetCode);

    if (!official) {
      continue;
    }

    const asset = trustlineAssetFromCode(
      assetCode,
      official.displayName,
      environment,
    );

    if (!asset) {
      continue;
    }

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
}

/** @deprecated Use assertAssetTrustlines */
export const assertUsdcTrustlines = assertAssetTrustlines;
