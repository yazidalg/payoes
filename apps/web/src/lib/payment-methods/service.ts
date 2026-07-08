import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import {
  getOfficialAsset,
  getOfficialAssetSubtitle,
  isOfficialAssetAvailable,
  isOfficialAssetCode,
  OFFICIAL_ASSETS,
  type OfficialAssetCode,
} from "@/lib/payment-methods/official-assets";
import { validateCustomAssetOnHorizon } from "@/lib/stellar/validate-asset";
import type { Organization } from "@/lib/db/schema";

export type PaymentMethod = typeof paymentMethods.$inferSelect;

export type SerializedPaymentMethod = {
  id: string;
  asset_code: string;
  issuer_address: string | null;
  display_name: string;
  subtitle: string | null;
  is_verified: boolean;
  is_enabled: boolean;
  is_default: boolean;
  is_official: boolean;
  created_at: Date;
  updated_at: Date;
};

function normalizeIssuer(issuer: string | null | undefined) {
  return issuer?.trim() || null;
}

export function serializePaymentMethod(method: PaymentMethod): SerializedPaymentMethod {
  const official = getOfficialAsset(method.assetCode);

  return {
    id: method.id,
    asset_code: method.assetCode,
    issuer_address: method.issuerAddress,
    display_name: method.displayName,
    subtitle:
      getOfficialAssetSubtitle(method.assetCode) ??
      (method.issuerAddress ? `Issuer ${method.issuerAddress}` : null),
    is_verified: Boolean(method.isVerified),
    is_enabled: Boolean(method.isEnabled),
    is_default: Boolean(method.isDefault),
    is_official: Boolean(official),
    created_at: method.createdAt,
    updated_at: method.updatedAt,
  };
}

async function seedDefaultPaymentMethods(organizationId: string) {
  const defaults: Array<{
    assetCode: string;
    displayName: string;
    isDefault: number;
  }> = [
    { assetCode: "USDC", displayName: "USDC", isDefault: 1 },
    { assetCode: "XLM", displayName: "XLM", isDefault: 0 },
  ];

  for (const item of defaults) {
    const existing = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.organizationId, organizationId),
          eq(paymentMethods.assetCode, item.assetCode)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      continue;
    }

    await db.insert(paymentMethods).values({
      organizationId,
      assetCode: item.assetCode,
      issuerAddress: null,
      displayName: item.displayName,
      isVerified: 1,
      isEnabled: 1,
      isDefault: item.isDefault,
    });
  }
}

export async function listPaymentMethods(organizationId: string) {
  let methods = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.organizationId, organizationId))
    .orderBy(asc(paymentMethods.createdAt));

  if (methods.length === 0) {
    await seedDefaultPaymentMethods(organizationId);
    methods = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.organizationId, organizationId))
      .orderBy(asc(paymentMethods.createdAt));
  }

  return methods;
}

export async function listEnabledPaymentMethods(organizationId: string) {
  const methods = await listPaymentMethods(organizationId);
  return methods.filter((method) => Boolean(method.isEnabled));
}

export async function getPaymentMethodById(
  organizationId: string,
  methodId: string
) {
  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.organizationId, organizationId),
        eq(paymentMethods.id, methodId)
      )
    )
    .limit(1);

  return method ?? null;
}

function findMatchingMethod(
  methods: PaymentMethod[],
  assetCode: string,
  issuerAddress?: string | null
) {
  const normalizedIssuer = normalizeIssuer(issuerAddress);

  return methods.find((method) => {
    if (method.assetCode !== assetCode) {
      return false;
    }

    return normalizeIssuer(method.issuerAddress) === normalizedIssuer;
  });
}

export async function assertEnabledPaymentMethod(
  organizationId: string,
  assetCode: string,
  issuerAddress?: string | null
) {
  const methods = await listPaymentMethods(organizationId);
  const method = findMatchingMethod(methods, assetCode, issuerAddress);

  if (!method) {
    throw new Error(`Asset ${assetCode} is not configured for this organization`);
  }

  if (!method.isEnabled) {
    throw new Error(`Asset ${assetCode} is disabled`);
  }

  return method;
}

export async function getDefaultSettlementMethod(organizationId: string) {
  const methods = await listPaymentMethods(organizationId);
  return methods.find((method) => Boolean(method.isDefault)) ?? null;
}

export async function addOfficialPaymentMethod(
  organizationId: string,
  code: OfficialAssetCode,
  environment: Organization["environment"]
) {
  const official = OFFICIAL_ASSETS.find((asset) => asset.code === code);

  if (!official) {
    throw new Error("Unknown official asset");
  }

  if (!isOfficialAssetAvailable(code, environment)) {
    throw new Error(`${code} is not available in ${environment} mode`);
  }

  const existing = await listPaymentMethods(organizationId);

  if (findMatchingMethod(existing, code, null)) {
    throw new Error(`${code} is already configured`);
  }

  const [created] = await db
    .insert(paymentMethods)
    .values({
      organizationId,
      assetCode: code,
      issuerAddress: null,
      displayName: official.displayName,
      isVerified: 1,
      isEnabled: 1,
      isDefault: existing.length === 0 ? 1 : 0,
    })
    .returning();

  return created;
}

export async function addCustomPaymentMethod(input: {
  organizationId: string;
  assetCode: string;
  issuerAddress: string;
  environment: Organization["environment"];
}) {
  if (isOfficialAssetCode(input.assetCode)) {
    throw new Error("Use official assets for USDC, XLM, and EURC");
  }

  const validation = await validateCustomAssetOnHorizon({
    assetCode: input.assetCode,
    issuerAddress: input.issuerAddress,
    environment: input.environment,
  });

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const existing = await listPaymentMethods(input.organizationId);

  if (findMatchingMethod(existing, input.assetCode, input.issuerAddress)) {
    throw new Error("This asset is already configured");
  }

  const [created] = await db
    .insert(paymentMethods)
    .values({
      organizationId: input.organizationId,
      assetCode: input.assetCode.toUpperCase(),
      issuerAddress: input.issuerAddress,
      displayName: validation.assetName,
      isVerified: 0,
      isEnabled: 1,
      isDefault: existing.length === 0 ? 1 : 0,
    })
    .returning();

  return created;
}

export async function updatePaymentMethod(
  organizationId: string,
  methodId: string,
  input: { isEnabled?: boolean }
) {
  const method = await getPaymentMethodById(organizationId, methodId);

  if (!method) {
    throw new Error("Payment method not found");
  }

  if (input.isEnabled === false && method.isDefault) {
    throw new Error("Cannot disable the settlement asset. Choose another default first.");
  }

  if (input.isEnabled === false) {
    const enabledCount = (await listPaymentMethods(organizationId)).filter(
      (row) => Boolean(row.isEnabled) && row.id !== methodId
    ).length;

    if (enabledCount === 0) {
      throw new Error("At least one payment method must remain enabled");
    }
  }

  const [updated] = await db
    .update(paymentMethods)
    .set({
      isEnabled: input.isEnabled === undefined ? method.isEnabled : input.isEnabled ? 1 : 0,
      updatedAt: new Date(),
    })
    .where(eq(paymentMethods.id, methodId))
    .returning();

  return updated;
}

export async function removePaymentMethod(organizationId: string, methodId: string) {
  const method = await getPaymentMethodById(organizationId, methodId);

  if (!method) {
    throw new Error("Payment method not found");
  }

  if (method.isDefault) {
    throw new Error("Cannot remove the settlement asset. Choose another default first.");
  }

  const enabledCount = (await listPaymentMethods(organizationId)).filter((row) =>
    Boolean(row.isEnabled)
  ).length;

  if (enabledCount <= 1 && method.isEnabled) {
    throw new Error("At least one payment method must remain enabled");
  }

  await db
    .delete(paymentMethods)
    .where(eq(paymentMethods.id, methodId));
}

export async function setDefaultSettlementMethod(
  organizationId: string,
  methodId: string
) {
  const method = await getPaymentMethodById(organizationId, methodId);

  if (!method) {
    throw new Error("Payment method not found");
  }

  if (!method.isEnabled) {
    throw new Error("Enable this asset before setting it as the settlement asset");
  }

  await db
    .update(paymentMethods)
    .set({ isDefault: 0, updatedAt: new Date() })
    .where(eq(paymentMethods.organizationId, organizationId));

  const [updated] = await db
    .update(paymentMethods)
    .set({ isDefault: 1, updatedAt: new Date() })
    .where(eq(paymentMethods.id, methodId))
    .returning();

  return updated;
}

export async function validateCustomAsset(input: {
  assetCode: string;
  issuerAddress: string;
  environment: Organization["environment"];
}) {
  return validateCustomAssetOnHorizon(input);
}

export function listAvailableOfficialAssets(
  _organizationId: string,
  methods: PaymentMethod[],
  environment: Organization["environment"]
) {
  return OFFICIAL_ASSETS.filter((asset) => {
    if (findMatchingMethod(methods, asset.code, null)) {
      return false;
    }

    return isOfficialAssetAvailable(asset.code, environment);
  });
}
