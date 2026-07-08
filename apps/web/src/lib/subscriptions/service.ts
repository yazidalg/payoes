import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  subscriptions,
  type Organization,
  type Subscription,
} from "@/lib/db/schema";
import { getCustomerByPublicId } from "@/lib/customers/service";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import { createInvoice, finalizeInvoice } from "@/lib/invoices/service";
import { normalizeStellarAmount } from "@/lib/stellar/amount";

function createSubscriptionPublicId() {
  return `sub_${randomBytes(12).toString("base64url")}`;
}

export function addBillingPeriod(
  start: Date,
  interval: Subscription["interval"],
  intervalCount: number
) {
  const end = new Date(start);

  if (interval === "month") {
    end.setMonth(end.getMonth() + intervalCount);
  } else {
    end.setFullYear(end.getFullYear() + intervalCount);
  }

  return end;
}

export async function listSubscriptions(
  organizationId: string,
  environment: Organization["environment"],
  limit = 50
) {
  return db
    .select({
      id: subscriptions.id,
      publicId: subscriptions.publicId,
      organizationId: subscriptions.organizationId,
      customerId: subscriptions.customerId,
      amount: subscriptions.amount,
      description: subscriptions.description,
      metadata: subscriptions.metadata,
      status: subscriptions.status,
      interval: subscriptions.interval,
      intervalCount: subscriptions.intervalCount,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      canceledAt: subscriptions.canceledAt,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
      customerPublicId: customers.publicId,
    })
    .from(subscriptions)
    .innerJoin(customers, eq(subscriptions.customerId, customers.id))
    .where(
      organizationEnvironmentWhere(
        subscriptions.organizationId,
        subscriptions.environment,
        organizationId,
        environment
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(limit);
}

export async function getSubscriptionByPublicId(publicId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.publicId, publicId))
    .limit(1);

  return subscription ?? null;
}

export async function getSubscriptionForOrganization(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const subscription = await getSubscriptionByPublicId(publicId);

  if (
    !subscription ||
    subscription.organizationId !== organizationId ||
    subscription.environment !== environment
  ) {
    return null;
  }

  return subscription;
}

export async function getSubscriptionDetail(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const subscription = await getSubscriptionForOrganization(
    publicId,
    organizationId,
    environment
  );

  if (!subscription) {
    return null;
  }

  const [customer] = await db
    .select({ publicId: customers.publicId })
    .from(customers)
    .where(eq(customers.id, subscription.customerId))
    .limit(1);

  return {
    subscription,
    customerPublicId: customer?.publicId ?? null,
  };
}

export async function createSubscription(input: {
  organizationId: string;
  environment: Organization["environment"];
  customerId: string;
  amount: string;
  description?: string | null;
  metadata?: Record<string, string> | null;
  interval?: Subscription["interval"];
  intervalCount?: number;
}) {
  const customer = await getCustomerByPublicId(input.customerId);

  if (!customer || customer.organizationId !== input.organizationId) {
    throw new Error("Customer not found");
  }

  if (customer.environment !== input.environment) {
    throw new Error("Customer environment does not match subscription environment");
  }

  const interval = input.interval ?? "month";
  const intervalCount = input.intervalCount ?? 1;
  const currentPeriodStart = new Date();
  const currentPeriodEnd = addBillingPeriod(
    currentPeriodStart,
    interval,
    intervalCount
  );
  const publicId = createSubscriptionPublicId();

  const [subscription] = await db
    .insert(subscriptions)
    .values({
      publicId,
      organizationId: input.organizationId,
      environment: input.environment,
      customerId: customer.id,
      amount: normalizeStellarAmount(input.amount),
      description: input.description?.trim() || null,
      metadata: input.metadata ?? null,
      status: "active",
      interval,
      intervalCount,
      currentPeriodStart,
      currentPeriodEnd,
    })
    .returning();

  return subscription;
}

export async function cancelSubscription(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const subscription = await getSubscriptionForOrganization(
    publicId,
    organizationId,
    environment
  );

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (subscription.status === "canceled") {
    return subscription;
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id))
    .returning();

  return updated;
}

export async function billSubscription(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const subscription = await getSubscriptionForOrganization(
    publicId,
    organizationId,
    environment
  );

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (subscription.status === "canceled") {
    throw new Error("Canceled subscriptions cannot be billed");
  }

  const [customer] = await db
    .select({ publicId: customers.publicId })
    .from(customers)
    .where(eq(customers.id, subscription.customerId))
    .limit(1);

  if (!customer) {
    throw new Error("Customer not found");
  }

  const dueInDays = Math.max(
    1,
    Math.ceil(
      (subscription.currentPeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    )
  );

  const invoice = await createInvoice({
    organizationId: subscription.organizationId,
    environment: subscription.environment,
    customerId: customer.publicId,
    amount: subscription.amount,
    description:
      subscription.description ??
      `Subscription ${subscription.publicId} billing`,
    metadata: subscription.metadata ?? undefined,
    dueInDays,
    subscriptionId: subscription.id,
  });

  const result = await finalizeInvoice(
    invoice.publicId,
    organizationId,
    environment
  );

  return { subscription, ...result };
}

export async function syncSubscriptionAfterInvoicePaid(subscriptionId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription || subscription.status === "canceled") {
    return;
  }

  const nextPeriodStart = subscription.currentPeriodEnd;
  const nextPeriodEnd = addBillingPeriod(
    nextPeriodStart,
    subscription.interval,
    subscription.intervalCount
  );

  await db
    .update(subscriptions)
    .set({
      status: "active",
      currentPeriodStart: nextPeriodStart,
      currentPeriodEnd: nextPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));
}

export async function markSubscriptionPastDue(subscriptionId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription || subscription.status === "canceled") {
    return;
  }

  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));
}

export function serializeSubscription(
  subscription: {
    publicId: string;
    status: Subscription["status"];
    amount: string;
    description: string | null;
    metadata: Record<string, string> | null;
    interval: Subscription["interval"];
    intervalCount: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    canceledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    customerPublicId?: string | null;
  }
) {
  return {
    id: subscription.publicId,
    object: "subscription",
    status: subscription.status,
    amount: subscription.amount,
    description: subscription.description,
    metadata: subscription.metadata,
    customer_id: subscription.customerPublicId ?? null,
    interval: subscription.interval,
    interval_count: subscription.intervalCount,
    current_period_start: subscription.currentPeriodStart,
    current_period_end: subscription.currentPeriodEnd,
    canceled_at: subscription.canceledAt,
    created_at: subscription.createdAt,
    updated_at: subscription.updatedAt,
  };
}

export function serializeSubscriptions(
  rows: Awaited<ReturnType<typeof listSubscriptions>>
) {
  return rows.map((row) => serializeSubscription(row));
}
