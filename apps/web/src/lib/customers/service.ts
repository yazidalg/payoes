import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, payments, type Customer, type Organization } from "@/lib/db/schema";
import { isValidStellarAddress } from "@/lib/stellar/validate-address";

function createPublicId() {
  return `cus_${randomBytes(12).toString("base64url")}`;
}

export async function listCustomers(organizationId: string, limit = 50) {
  return db
    .select()
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
    .orderBy(desc(customers.createdAt))
    .limit(limit);
}

export async function getCustomerByPublicId(publicId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.publicId, publicId))
    .limit(1);

  return customer ?? null;
}

export async function getCustomerById(id: string, organizationId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(eq(customers.id, id), eq(customers.organizationId, organizationId))
    )
    .limit(1);

  return customer ?? null;
}

export async function getCustomerByWallet(input: {
  organizationId: string;
  environment: Organization["environment"];
  stellarAddress: string;
}) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, input.organizationId),
        eq(customers.environment, input.environment),
        eq(customers.primaryStellarAddress, input.stellarAddress)
      )
    )
    .limit(1);

  return customer ?? null;
}

export async function createCustomer(input: {
  organizationId: string;
  environment: Organization["environment"];
  email?: string | null;
  name?: string | null;
  primaryStellarAddress?: string | null;
  notes?: string | null;
  metadata?: Record<string, string> | null;
}) {
  if (
    input.primaryStellarAddress &&
    !isValidStellarAddress(input.primaryStellarAddress)
  ) {
    throw new Error("Invalid Stellar wallet address");
  }

  if (input.primaryStellarAddress) {
    const existing = await getCustomerByWallet({
      organizationId: input.organizationId,
      environment: input.environment,
      stellarAddress: input.primaryStellarAddress,
    });

    if (existing) {
      throw new Error("A customer with this wallet address already exists");
    }
  }

  const [customer] = await db
    .insert(customers)
    .values({
      publicId: createPublicId(),
      organizationId: input.organizationId,
      environment: input.environment,
      email: input.email?.trim() || null,
      name: input.name?.trim() || null,
      primaryStellarAddress: input.primaryStellarAddress?.trim() || null,
      notes: input.notes?.trim() || null,
      metadata: input.metadata ?? null,
    })
    .returning();

  return customer;
}

export async function updateCustomer(
  customer: Customer,
  input: {
    email?: string | null;
    name?: string | null;
    primaryStellarAddress?: string | null;
    notes?: string | null;
    metadata?: Record<string, string> | null;
  }
) {
  if (
    input.primaryStellarAddress &&
    !isValidStellarAddress(input.primaryStellarAddress)
  ) {
    throw new Error("Invalid Stellar wallet address");
  }

  if (
    input.primaryStellarAddress &&
    input.primaryStellarAddress !== customer.primaryStellarAddress
  ) {
    const existing = await getCustomerByWallet({
      organizationId: customer.organizationId,
      environment: customer.environment,
      stellarAddress: input.primaryStellarAddress,
    });

    if (existing && existing.id !== customer.id) {
      throw new Error("A customer with this wallet address already exists");
    }
  }

  const [updated] = await db
    .update(customers)
    .set({
      email:
        input.email !== undefined ? input.email?.trim() || null : customer.email,
      name:
        input.name !== undefined ? input.name?.trim() || null : customer.name,
      primaryStellarAddress:
        input.primaryStellarAddress !== undefined
          ? input.primaryStellarAddress?.trim() || null
          : customer.primaryStellarAddress,
      notes:
        input.notes !== undefined ? input.notes?.trim() || null : customer.notes,
      metadata:
        input.metadata !== undefined ? input.metadata : customer.metadata,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customer.id))
    .returning();

  return updated;
}

export async function upsertCustomerFromWallet(input: {
  organizationId: string;
  environment: Organization["environment"];
  stellarAddress: string;
}) {
  if (!isValidStellarAddress(input.stellarAddress)) {
    throw new Error("Invalid payer wallet address");
  }

  const existing = await getCustomerByWallet(input);

  if (existing) {
    const [updated] = await db
      .update(customers)
      .set({ updatedAt: new Date() })
      .where(eq(customers.id, existing.id))
      .returning();

    return updated;
  }

  const [customer] = await db
    .insert(customers)
    .values({
      publicId: createPublicId(),
      organizationId: input.organizationId,
      environment: input.environment,
      primaryStellarAddress: input.stellarAddress,
    })
    .returning();

  return customer;
}

export async function linkCustomerToPayment(input: {
  customer: Customer;
  stellarAddress: string;
}) {
  if (!isValidStellarAddress(input.stellarAddress)) {
    return input.customer;
  }

  if (input.customer.primaryStellarAddress === input.stellarAddress) {
    return input.customer;
  }

  if (!input.customer.primaryStellarAddress) {
    return updateCustomer(input.customer, {
      primaryStellarAddress: input.stellarAddress,
    });
  }

  return input.customer;
}

export async function listPaymentsForCustomer(customerId: string, limit = 50) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.customerId, customerId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

export function serializeCustomer(customer: Customer) {
  return {
    id: customer.publicId,
    email: customer.email,
    name: customer.name,
    primary_stellar_address: customer.primaryStellarAddress,
    notes: customer.notes,
    metadata: customer.metadata,
    environment: customer.environment,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
  };
}

export async function resolveCustomerPublicId(customerId: string | null) {
  if (!customerId) {
    return null;
  }

  const [customer] = await db
    .select({ publicId: customers.publicId })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  return customer?.publicId ?? null;
}

export async function getCustomerPublicIdMap(customerIds: string[]) {
  const uniqueIds = [...new Set(customerIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const rows = await db
    .select({ id: customers.id, publicId: customers.publicId })
    .from(customers)
    .where(inArray(customers.id, uniqueIds));

  return new Map(rows.map((row) => [row.id, row.publicId] as const));
}
