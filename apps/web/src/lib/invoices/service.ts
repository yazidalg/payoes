import { randomBytes } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  invoices,
  type Invoice,
  type Organization,
} from "@/lib/db/schema";
import type { AcceptedAsset } from "@/lib/organizations/wallet-constants";
import { getCustomerByPublicId } from "@/lib/customers/service";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import {
  createCheckoutSession,
  getCheckoutSessionUrl,
} from "@/lib/checkout-sessions/service";
import { normalizeStellarAmount } from "@/lib/stellar/amount";

function createInvoicePublicId() {
  return `inv_${randomBytes(12).toString("base64url")}`;
}

export async function listInvoices(
  organizationId: string,
  environment: Organization["environment"],
  limit = 50
) {
  return db
    .select({
      id: invoices.id,
      publicId: invoices.publicId,
      organizationId: invoices.organizationId,
      customerId: invoices.customerId,
      subscriptionId: invoices.subscriptionId,
      checkoutSessionId: invoices.checkoutSessionId,
      amount: invoices.amount,
      asset: invoices.asset,
      description: invoices.description,
      metadata: invoices.metadata,
      status: invoices.status,
      dueAt: invoices.dueAt,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      customerPublicId: customers.publicId,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      organizationEnvironmentWhere(
        invoices.organizationId,
        invoices.environment,
        organizationId,
        environment
      )
    )
    .orderBy(desc(invoices.createdAt))
    .limit(limit);
}

export async function getInvoiceByPublicId(publicId: string) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.publicId, publicId))
    .limit(1);

  return invoice ?? null;
}

export async function getInvoiceForOrganization(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const invoice = await getInvoiceByPublicId(publicId);

  if (
    !invoice ||
    invoice.organizationId !== organizationId ||
    invoice.environment !== environment
  ) {
    return null;
  }

  return invoice;
}

export async function getInvoiceDetail(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const invoice = await getInvoiceForOrganization(
    publicId,
    organizationId,
    environment
  );

  if (!invoice) {
    return null;
  }

  const [customer] = await db
    .select({ publicId: customers.publicId })
    .from(customers)
    .where(eq(customers.id, invoice.customerId))
    .limit(1);

  let checkoutUrl: string | null = null;
  let checkoutSessionPublicId: string | null = null;

  if (invoice.checkoutSessionId) {
    const { checkoutSessions } = await import("@/lib/db/schema");
    const [session] = await db
      .select({ publicId: checkoutSessions.publicId })
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, invoice.checkoutSessionId))
      .limit(1);

    if (session) {
      checkoutSessionPublicId = session.publicId;
      checkoutUrl = getCheckoutSessionUrl(session.publicId);
    }
  }

  return {
    invoice,
    customerPublicId: customer?.publicId ?? null,
    checkoutUrl,
    checkoutSessionPublicId,
  };
}

export async function createInvoice(input: {
  organizationId: string;
  environment: Organization["environment"];
  customerId: string;
  amount: string;
  asset: AcceptedAsset;
  description?: string | null;
  metadata?: Record<string, string> | null;
  dueInDays?: number;
  subscriptionId?: string | null;
}) {
  const customer = await getCustomerByPublicId(input.customerId);

  if (!customer || customer.organizationId !== input.organizationId) {
    throw new Error("Customer not found");
  }

  if (customer.environment !== input.environment) {
    throw new Error("Customer environment does not match invoice environment");
  }

  const publicId = createInvoicePublicId();
  const dueAt =
    input.dueInDays !== undefined
      ? new Date(Date.now() + input.dueInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [invoice] = await db
    .insert(invoices)
    .values({
      publicId,
      organizationId: input.organizationId,
      environment: input.environment,
      customerId: customer.id,
      subscriptionId: input.subscriptionId ?? null,
      amount: normalizeStellarAmount(input.amount),
      asset: input.asset,
      description: input.description?.trim() || null,
      metadata: input.metadata ?? null,
      status: "draft",
      dueAt,
    })
    .returning();

  return invoice;
}

export async function finalizeInvoice(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const invoice = await getInvoiceForOrganization(
    publicId,
    organizationId,
    environment
  );

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status !== "draft") {
    throw new Error(`Invoice is ${invoice.status}`);
  }

  const [customer] = await db
    .select({ publicId: customers.publicId })
    .from(customers)
    .where(eq(customers.id, invoice.customerId))
    .limit(1);

  if (!customer) {
    throw new Error("Customer not found");
  }

  const sourceType = invoice.subscriptionId ? "subscription" : "invoice";

  const { session, payment } = await createCheckoutSession({
    organizationId: invoice.organizationId,
    environment: invoice.environment,
    amount: invoice.amount,
    asset: invoice.asset,
    description: invoice.description,
    metadata: invoice.metadata ?? undefined,
    customerId: customer.publicId,
    sourceType,
    invoiceId: invoice.id,
    subscriptionId: invoice.subscriptionId,
    expiresInMinutes: invoice.dueAt
      ? Math.max(
          5,
          Math.ceil((invoice.dueAt.getTime() - Date.now()) / (60 * 1000))
        )
      : undefined,
  });

  const [updated] = await db
    .update(invoices)
    .set({
      status: "open",
      checkoutSessionId: session.id,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id))
    .returning();

  return {
    invoice: updated,
    session,
    payment,
    checkoutUrl: getCheckoutSessionUrl(session.publicId),
  };
}

export async function voidInvoice(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const invoice = await getInvoiceForOrganization(
    publicId,
    organizationId,
    environment
  );

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "paid") {
    throw new Error("Paid invoices cannot be voided");
  }

  const [updated] = await db
    .update(invoices)
    .set({
      status: "void",
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id))
    .returning();

  return updated;
}

export async function syncInvoiceWithPayment(payment: {
  id: string;
  invoiceId: string | null;
  status: string;
  confirmedAt?: Date | null;
}) {
  if (!payment.invoiceId) {
    return;
  }

  if (payment.status === "completed") {
    await db
      .update(invoices)
      .set({
        status: "paid",
        paidAt: payment.confirmedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, payment.invoiceId));

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, payment.invoiceId))
      .limit(1);

    if (invoice?.subscriptionId) {
      const { syncSubscriptionAfterInvoicePaid } = await import(
        "@/lib/subscriptions/service"
      );
      await syncSubscriptionAfterInvoicePaid(invoice.subscriptionId);
    }

    return;
  }

  if (payment.status === "expired") {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, payment.invoiceId))
      .limit(1);

    if (invoice?.subscriptionId) {
      const { markSubscriptionPastDue } = await import(
        "@/lib/subscriptions/service"
      );
      await markSubscriptionPastDue(invoice.subscriptionId);
    }
  }
}

export function serializeInvoice(
  invoice: {
    publicId: string;
    status: Invoice["status"];
    amount: string;
    asset: string;
    description: string | null;
    metadata: Record<string, string> | null;
    dueAt: Date | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    customerPublicId?: string | null;
  },
  options?: {
    checkoutUrl?: string | null;
    checkoutSessionPublicId?: string | null;
    subscriptionPublicId?: string | null;
  }
) {
  return {
    id: invoice.publicId,
    object: "invoice",
    status: invoice.status,
    amount: invoice.amount,
    asset: invoice.asset,
    description: invoice.description,
    metadata: invoice.metadata,
    customer_id: invoice.customerPublicId ?? null,
    subscription_id: options?.subscriptionPublicId ?? null,
    checkout_session_id: options?.checkoutSessionPublicId ?? null,
    checkout_url: options?.checkoutUrl ?? null,
    due_at: invoice.dueAt,
    paid_at: invoice.paidAt,
    created_at: invoice.createdAt,
    updated_at: invoice.updatedAt,
  };
}

export async function serializeInvoices(
  rows: Awaited<ReturnType<typeof listInvoices>>
) {
  const sessionIds = rows
    .map((row) => row.checkoutSessionId)
    .filter((id): id is string => Boolean(id));

  const { checkoutSessions, subscriptions } = await import("@/lib/db/schema");
  const sessionRows =
    sessionIds.length > 0
      ? await db
          .select({ id: checkoutSessions.id, publicId: checkoutSessions.publicId })
          .from(checkoutSessions)
          .where(inArray(checkoutSessions.id, sessionIds))
      : [];

  const subscriptionIds = rows
    .map((row) => row.subscriptionId)
    .filter((id): id is string => Boolean(id));

  const subscriptionRows =
    subscriptionIds.length > 0
      ? await db
          .select({ id: subscriptions.id, publicId: subscriptions.publicId })
          .from(subscriptions)
          .where(inArray(subscriptions.id, subscriptionIds))
      : [];

  const sessionMap = new Map(
    sessionRows.map((row) => [row.id, row.publicId] as const)
  );

  const subscriptionMap = new Map(
    subscriptionRows.map((row) => [row.id, row.publicId] as const)
  );

  return rows.map((row) => {
    const sessionPublicId = row.checkoutSessionId
      ? (sessionMap.get(row.checkoutSessionId) ?? null)
      : null;

    return serializeInvoice(
      { ...row, customerPublicId: row.customerPublicId },
      {
        subscriptionPublicId: row.subscriptionId
          ? (subscriptionMap.get(row.subscriptionId) ?? null)
          : null,
        checkoutSessionPublicId: sessionPublicId,
        checkoutUrl: sessionPublicId ? getCheckoutSessionUrl(sessionPublicId) : null,
      }
    );
  });
}
