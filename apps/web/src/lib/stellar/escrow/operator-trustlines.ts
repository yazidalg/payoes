import { TransactionBuilder } from "@stellar/stellar-sdk";
import type { AllowedAsset } from "@/lib/assets/types";
import type { Organization, Payment } from "@/lib/db/schema";
import { paymentAllowedAssets } from "@/lib/assets/serialize";
import { resolveStellarAsset } from "@/lib/stellar/assets";
import { getEscrowConfig, isEscrowConfigured } from "@/lib/stellar/escrow/config";
import { submitEscrowSignedXdr } from "@/lib/stellar/escrow/submit";
import { getNetworkPassphrase } from "@/lib/stellar/network";
import {
  isOfficialAssetCode,
  resolveOfficialIssuer,
} from "@/lib/payment-methods/official-assets";
import {
  accountTrustsAsset,
  buildChangeTrustTransactionXdr,
  getMissingTrustlines,
  type TrustlineAsset,
} from "@/lib/stellar/trustlines";

const TRUSTLINE_BATCH_SIZE = 40;

function resolveTrustlineAsset(
  asset: AllowedAsset,
  environment: Organization["environment"],
): TrustlineAsset | null {
  if (asset.asset_code === "XLM") {
    return null;
  }

  let issuer = asset.issuer_address?.trim() || null;

  if (!issuer && isOfficialAssetCode(asset.asset_code)) {
    issuer = resolveOfficialIssuer(asset.asset_code, environment);
  }

  if (!issuer) {
    return null;
  }

  return {
    asset_code: asset.asset_code,
    issuer_address: issuer,
    display_name: asset.asset_code,
  };
}

export function allowedAssetsToTrustlineAssets(
  assets: AllowedAsset[],
  environment: Organization["environment"],
): TrustlineAsset[] {
  const unique = new Map<string, TrustlineAsset>();

  for (const asset of assets) {
    const trustlineAsset = resolveTrustlineAsset(asset, environment);

    if (!trustlineAsset) {
      continue;
    }

    unique.set(
      `${trustlineAsset.asset_code}:${trustlineAsset.issuer_address}`,
      trustlineAsset,
    );
  }

  return Array.from(unique.values());
}

export async function ensureEscrowOperatorTrustlinesForAllowedAssets(
  environment: Organization["environment"],
  allowedAssets: AllowedAsset[],
) {
  if (!isEscrowConfigured(environment)) {
    return { added: [] as TrustlineAsset[], hash: null as string | null };
  }

  const trustlineAssets = allowedAssetsToTrustlineAssets(
    allowedAssets,
    environment,
  );

  if (trustlineAssets.length === 0) {
    return { added: [] as TrustlineAsset[], hash: null as string | null };
  }

  const escrow = getEscrowConfig(environment);
  const missing = await getMissingTrustlines(
    escrow.publicKey,
    trustlineAssets,
    environment,
  );

  if (missing.length === 0) {
    return { added: [] as TrustlineAsset[], hash: null as string | null };
  }

  const added: TrustlineAsset[] = [];
  let lastHash: string | null = null;

  for (let index = 0; index < missing.length; index += TRUSTLINE_BATCH_SIZE) {
    const batch = missing.slice(index, index + TRUSTLINE_BATCH_SIZE);
    const xdr = await buildChangeTrustTransactionXdr({
      sourcePublicKey: escrow.publicKey,
      assets: batch,
      environment,
    });

    const transaction = TransactionBuilder.fromXDR(
      xdr,
      getNetworkPassphrase(environment),
    );
    transaction.sign(escrow.keypair);

    const response = await submitEscrowSignedXdr({
      signedXdr: transaction.toXDR(),
      environment,
    });

    added.push(...batch);
    lastHash = response.hash;
  }

  return { added, hash: lastHash };
}

export async function ensureEscrowOperatorTrustlinesForPayment(payment: Payment) {
  return ensureEscrowOperatorTrustlinesForAllowedAssets(
    payment.environment,
    paymentAllowedAssets(payment),
  );
}

export async function getEscrowDepositTrustlineError(input: {
  asset: AllowedAsset;
  environment: Organization["environment"];
}): Promise<string | null> {
  if (input.asset.asset_code === "XLM" || !input.asset.issuer_address) {
    if (input.asset.asset_code === "XLM") {
      return null;
    }

    const resolved = resolveTrustlineAsset(input.asset, input.environment);
    if (!resolved) {
      return `${input.asset.asset_code} is not configured for deposits on this network.`;
    }
  }

  const trustlineAsset = resolveTrustlineAsset(input.asset, input.environment);

  if (!trustlineAsset) {
    return null;
  }

  const escrow = getEscrowConfig(input.environment);
  const stellarAsset = resolveStellarAsset(
    {
      assetCode: trustlineAsset.asset_code,
      issuerAddress: trustlineAsset.issuer_address,
    },
    input.environment,
  );

  const acceptsAsset = await accountTrustsAsset(
    escrow.publicKey,
    stellarAsset,
    input.environment,
  );

  if (acceptsAsset) {
    return null;
  }

  return `${input.asset.asset_code} deposits are not ready yet. Wait a moment and try again, or pay with XLM.`;
}

export async function syncEscrowOperatorTrustlines(input: {
  environment: Organization["environment"];
  allowedAssets: AllowedAsset[];
}) {
  return ensureEscrowOperatorTrustlinesForAllowedAssets(
    input.environment,
    input.allowedAssets,
  );
}
