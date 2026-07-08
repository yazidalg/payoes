import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  organizationReceivingWallets,
  type Organization,
  type OrganizationReceivingWallet,
} from "@/lib/db/schema";

export async function getReceivingWallet(
  organizationId: string,
  environment: Organization["environment"]
) {
  const [wallet] = await db
    .select()
    .from(organizationReceivingWallets)
    .where(
      and(
        eq(organizationReceivingWallets.organizationId, organizationId),
        eq(organizationReceivingWallets.environment, environment)
      )
    )
    .limit(1);

  return wallet ?? null;
}

export function receivingWalletNotConfiguredMessage(
  environment: Organization["environment"]
) {
  if (environment === "production") {
    return "Production receiving wallet is not configured. Open Settings → Receiving Wallet, connect your mainnet wallet, and click Save changes.";
  }

  return "Sandbox receiving wallet is not configured. Open Settings → Receiving Wallet, connect your testnet wallet, and click Save changes.";
}

export async function requireReceivingWallet(
  organizationId: string,
  environment: Organization["environment"]
) {
  const wallet = await getReceivingWallet(organizationId, environment);

  if (!wallet) {
    throw new Error(receivingWalletNotConfiguredMessage(environment));
  }

  return wallet;
}

export async function organizationHasReceivingWallet(
  organizationId: string,
  environment: Organization["environment"]
) {
  const wallet = await getReceivingWallet(organizationId, environment);
  return Boolean(wallet);
}

export async function upsertReceivingWallet(input: {
  organizationId: string;
  environment: Organization["environment"];
  stellarAddress: string;
  walletProvider?: string | null;
}): Promise<OrganizationReceivingWallet> {
  const existing = await getReceivingWallet(
    input.organizationId,
    input.environment
  );

  if (existing) {
    const [wallet] = await db
      .update(organizationReceivingWallets)
      .set({
        stellarAddress: input.stellarAddress,
        walletProvider: input.walletProvider ?? null,
        connectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizationReceivingWallets.id, existing.id))
      .returning();

    return wallet;
  }

  const [wallet] = await db
    .insert(organizationReceivingWallets)
    .values({
      organizationId: input.organizationId,
      environment: input.environment,
      stellarAddress: input.stellarAddress,
      walletProvider: input.walletProvider ?? null,
    })
    .returning();

  return wallet;
}

export async function getPrimaryOrganizationForUser(userId: string) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .orderBy(asc(organizationMembers.createdAt))
    .limit(1);

  if (!membership) {
    return null;
  }

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, membership.organizationId))
    .limit(1);

  return organization ?? null;
}

export async function userHasReceivingWallet(userId: string) {
  const organization = await getPrimaryOrganizationForUser(userId);

  if (!organization) {
    return false;
  }

  return organizationHasReceivingWallet(
    organization.id,
    organization.environment
  );
}

export async function getOrganizationForMember(
  organizationId: string,
  userId: string
) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, membership.organizationId))
    .limit(1);

  return organization ?? null;
}
