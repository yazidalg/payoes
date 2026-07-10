import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  organizationSettlementWallets,
  type Organization,
  type OrganizationSettlementWallet,
} from "@/lib/db/schema";

export async function getSettlementWallet(
  organizationId: string,
  environment: Organization["environment"],
) {
  const [wallet] = await db
    .select()
    .from(organizationSettlementWallets)
    .where(
      and(
        eq(organizationSettlementWallets.organizationId, organizationId),
        eq(organizationSettlementWallets.environment, environment),
      ),
    )
    .limit(1);

  return wallet ?? null;
}

export function settlementWalletNotConfiguredMessage(
  environment: Organization["environment"],
) {
  if (environment === "production") {
    return "Production settlement wallet is not configured. Open Settings → Settlement Wallet and connect your Mainnet wallet.";
  }

  return "Sandbox settlement wallet is not configured. Open Settings → Settlement Wallet and connect your Testnet wallet.";
}

export async function requireSettlementWallet(
  organizationId: string,
  environment: Organization["environment"],
) {
  const wallet = await getSettlementWallet(organizationId, environment);

  if (!wallet) {
    throw new Error(settlementWalletNotConfiguredMessage(environment));
  }

  return wallet;
}

export async function organizationHasSettlementWallet(
  organizationId: string,
  environment: Organization["environment"],
) {
  const wallet = await getSettlementWallet(organizationId, environment);
  return Boolean(wallet);
}

export async function upsertSettlementWallet(input: {
  organizationId: string;
  environment: Organization["environment"];
  stellarAddress: string;
  walletProvider?: string | null;
}): Promise<OrganizationSettlementWallet> {
  const existing = await getSettlementWallet(
    input.organizationId,
    input.environment,
  );

  if (existing) {
    const [wallet] = await db
      .update(organizationSettlementWallets)
      .set({
        stellarAddress: input.stellarAddress,
        walletProvider: input.walletProvider ?? null,
        connectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizationSettlementWallets.id, existing.id))
      .returning();

    return wallet;
  }

  const [wallet] = await db
    .insert(organizationSettlementWallets)
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

export async function userHasSettlementWallet(userId: string) {
  const organization = await getPrimaryOrganizationForUser(userId);

  if (!organization) {
    return false;
  }

  return organizationHasSettlementWallet(
    organization.id,
    organization.environment,
  );
}

export async function getOrganizationForMember(
  organizationId: string,
  userId: string,
) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
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
