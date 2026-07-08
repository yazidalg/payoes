import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paymentLinks, type Organization } from "@/lib/db/schema";
import type { AllowedAsset } from "@/lib/assets/types";
import { resolveAssetConfig } from "@/lib/assets/config";
import {
  dbAllowedAssets,
  serializePaymentLinkAssets,
} from "@/lib/assets/serialize";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import { createPayment, getCheckoutUrl } from "@/lib/payments/service";

function createLinkPublicId() {
  return `plink_${randomBytes(12).toString("base64url")}`;
}

export function getPaymentLinkUrl(publicId: string) {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/l/${publicId}`;
}

export async function listPaymentLinks(
  organizationId: string,
  environment: Organization["environment"],
  limit = 50
) {
  return db
    .select()
    .from(paymentLinks)
    .where(
      organizationEnvironmentWhere(
        paymentLinks.organizationId,
        paymentLinks.environment,
        organizationId,
        environment
      )
    )
    .orderBy(desc(paymentLinks.createdAt))
    .limit(limit);
}

export async function getPaymentLinkByPublicId(publicId: string) {
  const [link] = await db
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.publicId, publicId))
    .limit(1);

  return link ?? null;
}

export async function getPaymentLinkForOrganization(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const link = await getPaymentLinkByPublicId(publicId);

  if (
    !link ||
    link.organizationId !== organizationId ||
    link.environment !== environment
  ) {
    return null;
  }

  return link;
}

export async function createPaymentLink(input: {
  organizationId: string;
  environment: Organization["environment"];
  amount: string;
  settlementAsset?: AllowedAsset | null;
  allowedAssets?: AllowedAsset[] | null;
  description?: string | null;
  metadata?: Record<string, string> | null;
}) {
  const assetConfig = await resolveAssetConfig({
    organizationId: input.organizationId,
    settlementAsset: input.settlementAsset,
    allowedAssets: input.allowedAssets,
  });

  const publicId = createLinkPublicId();

  const [link] = await db
    .insert(paymentLinks)
    .values({
      publicId,
      organizationId: input.organizationId,
      environment: input.environment,
      amount: input.amount,
      settlementAsset: assetConfig.settlement_asset.asset_code,
      settlementAssetIssuer: assetConfig.settlement_asset.issuer_address,
      allowedAssets: dbAllowedAssets(assetConfig.allowed_assets),
      description: input.description?.trim() || null,
      metadata: input.metadata ?? null,
      active: 1,
    })
    .returning();

  return link;
}

export async function startCheckoutFromPaymentLink(publicId: string) {
  const link = await getPaymentLinkByPublicId(publicId);

  if (!link || !link.active) {
    return null;
  }

  const payment = await createPayment({
    organizationId: link.organizationId,
    environment: link.environment,
    amount: link.amount,
    settlementAsset: {
      asset_code: link.settlementAsset,
      issuer_address: link.settlementAssetIssuer,
    },
    allowedAssets: link.allowedAssets ?? [],
    description: link.description,
    metadata: link.metadata ?? undefined,
    sourceType: "payment_link",
    paymentLinkId: link.id,
  });

  await db
    .update(paymentLinks)
    .set({ updatedAt: new Date() })
    .where(eq(paymentLinks.id, link.id));

  return { link, payment, checkoutUrl: getCheckoutUrl(payment.publicId) };
}

export function serializePaymentLink(link: typeof paymentLinks.$inferSelect) {
  return {
    id: link.publicId,
    object: "payment_link",
    amount: link.amount,
    ...serializePaymentLinkAssets(link),
    description: link.description,
    active: Boolean(link.active),
    metadata: link.metadata,
    url: getPaymentLinkUrl(link.publicId),
    environment: link.environment,
    created_at: link.createdAt,
    updated_at: link.updatedAt,
  };
}
