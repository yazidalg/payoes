import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paymentLinks, type Organization } from "@/lib/db/schema";
import type { AcceptedAsset } from "@/lib/organizations/wallet-constants";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import { createCheckoutSession } from "@/lib/checkout-sessions/service";

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
  asset: AcceptedAsset;
  description?: string | null;
  metadata?: Record<string, string> | null;
}) {
  const publicId = createLinkPublicId();

  const [link] = await db
    .insert(paymentLinks)
    .values({
      publicId,
      organizationId: input.organizationId,
      environment: input.environment,
      amount: input.amount,
      asset: input.asset,
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

  const { session, payment } = await createCheckoutSession({
    organizationId: link.organizationId,
    environment: link.environment,
    amount: link.amount,
    asset: link.asset,
    description: link.description,
    metadata: link.metadata ?? undefined,
    sourceType: "payment_link",
    paymentLinkId: link.id,
  });

  await db
    .update(paymentLinks)
    .set({ updatedAt: new Date() })
    .where(eq(paymentLinks.id, link.id));

  return { link, session, payment };
}

export function serializePaymentLink(link: typeof paymentLinks.$inferSelect) {
  return {
    id: link.publicId,
    object: "payment_link",
    amount: link.amount,
    asset: link.asset,
    description: link.description,
    active: Boolean(link.active),
    metadata: link.metadata,
    url: getPaymentLinkUrl(link.publicId),
    environment: link.environment,
    created_at: link.createdAt,
    updated_at: link.updatedAt,
  };
}
