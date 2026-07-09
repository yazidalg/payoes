import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, exists, ilike, inArray, isNotNull, isNull, not, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, payments, type Customer, type Organization } from "@/lib/db/schema";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import { isValidStellarAddress } from "@/lib/stellar/validate-address";

function createPublicId() {
  return `cus_${randomBytes(12).toString("base64url")}`;
}

export async function listCustomers(
  organizationId: string,
  environment: Organization["environment"],
  limit = 50
) {
  return db
    .select()
    .from(customers)
    .where(
      organizationEnvironmentWhere(
        customers.organizationId,
        customers.environment,
        organizationId,
        environment
      )
    )
    .orderBy(desc(customers.createdAt))
    .limit(limit);
}

export type CustomerSortField = "created_at" | "email" | "name";
export type CustomerSortOrder = "asc" | "desc";

export type ListCustomersQuery = {
  page?: number;
  pageSize?: number;
  sortBy?: CustomerSortField;
  sortOrder?: CustomerSortOrder;
  search?: string;
  walletStatus?: "linked" | "unlinked";
  emailStatus?: "present" | "missing";
  paymentStatus?: "has_payments" | "no_payments";
};

export async function listCustomersPaginated(
  organizationId: string,
  environment: Organization["environment"],
  query: ListCustomersQuery = {},
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const sortBy = query.sortBy ?? "created_at";
  const sortOrder = query.sortOrder ?? "desc";
  const search = query.search?.trim();

  const envWhere = organizationEnvironmentWhere(
    customers.organizationId,
    customers.environment,
    organizationId,
    environment,
  );

  let whereClause: SQL | undefined = envWhere;

  if (search) {
    const pattern = `%${search}%`;
    whereClause = and(
      whereClause,
      or(
        ilike(customers.name, pattern),
        ilike(customers.email, pattern),
        ilike(customers.publicId, pattern),
        ilike(customers.primaryStellarAddress, pattern),
      ),
    );
  }

  if (query.walletStatus === "linked") {
    whereClause = and(
      whereClause,
      isNotNull(customers.primaryStellarAddress),
      sql`trim(${customers.primaryStellarAddress}) <> ''`,
    );
  } else if (query.walletStatus === "unlinked") {
    whereClause = and(
      whereClause,
      or(
        isNull(customers.primaryStellarAddress),
        sql`trim(${customers.primaryStellarAddress}) = ''`,
      ),
    );
  }

  if (query.emailStatus === "present") {
    whereClause = and(
      whereClause,
      isNotNull(customers.email),
      sql`trim(${customers.email}) <> ''`,
    );
  } else if (query.emailStatus === "missing") {
    whereClause = and(
      whereClause,
      or(isNull(customers.email), sql`trim(${customers.email}) = ''`),
    );
  }

  if (query.paymentStatus === "has_payments") {
    whereClause = and(
      whereClause,
      exists(
        db
          .select({ id: payments.id })
          .from(payments)
          .where(
            and(
              eq(payments.customerId, customers.id),
              eq(payments.environment, environment),
            ),
          ),
      ),
    );
  } else if (query.paymentStatus === "no_payments") {
    whereClause = and(
      whereClause,
      not(
        exists(
          db
            .select({ id: payments.id })
            .from(payments)
            .where(
              and(
                eq(payments.customerId, customers.id),
                eq(payments.environment, environment),
              ),
            ),
        ),
      ),
    );
  }

  const sortColumn = {
    created_at: customers.createdAt,
    email: customers.email,
    name: customers.name,
  }[sortBy];

  const orderFn = sortOrder === "asc" ? asc : desc;

  const [countResult] = await db
    .select({ count: count() })
    .from(customers)
    .where(whereClause);

  const rows = await db
    .select()
    .from(customers)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(pageSize)
    .offset(offset);

  return {
    customers: rows,
    total: Number(countResult?.count ?? 0),
  };
}

export async function getCustomerForOrganization(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const customer = await getCustomerByPublicId(publicId);

  if (
    !customer ||
    customer.organizationId !== organizationId ||
    customer.environment !== environment
  ) {
    return null;
  }

  return customer;
}

export async function getCustomerByPublicId(publicId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.publicId, publicId))
    .limit(1);

  return customer ?? null;
}

export async function getCustomerById(
  id: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, id),
        eq(customers.organizationId, organizationId),
        eq(customers.environment, environment)
      )
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

export async function listPaymentsForCustomer(
  customerId: string,
  environment: Organization["environment"],
  limit = 50
) {
  return db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.customerId, customerId),
        eq(payments.environment, environment)
      )
    )
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
