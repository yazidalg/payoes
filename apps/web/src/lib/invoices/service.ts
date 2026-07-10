import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  invoiceItems,
  invoices,
  organizations,
  type Invoice,
  type Organization,
} from "@/lib/db/schema";
import { getInvoiceEnvironmentLabel } from "@/components/shared/environment-badge";
import { getOrganizationDefaultAssetConfig } from "@/lib/assets/config";
import { serializePaymentAssets } from "@/lib/assets/serialize";
import { getCustomerByPublicId } from "@/lib/customers/service";
import { sendInvoiceEmail } from "@/lib/email/send-invoice-email";
import {
  calculateInvoiceTotal,
  lineItemAmount,
  parseFiatAmount,
  type InvoiceLineItemInput,
} from "@/lib/invoices/amount";
import { DEFAULT_INVOICE_DUE_DAYS } from "@/constants/invoices/currencies";
import {
  MIN_PAYMENT_EXPIRY_MINUTES,
  PLACEHOLDER_PRICING_PAYMENT_AMOUNT,
} from "@/constants/payments/defaults";
import {
  getInvoiceCurrency,
  isInvoiceCurrencyCode,
  type InvoiceCurrencyCode,
} from "@/lib/invoices/currencies";
import {
  buildInvoiceEmailText,
  mapInvoicePresentationToEmailProps,
  renderInvoiceEmailHtml,
  type InvoicePresentation,
} from "@/lib/invoices/presentation";
import { getHostedInvoiceUrl } from "@/lib/invoices/url";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import {
  createCheckoutSession,
  getCheckoutSessionUrl,
} from "@/lib/checkout-sessions/service";
import { normalizeStellarAmount } from "@/lib/stellar/amount";

function createInvoicePublicId() {
  return `inv_${randomBytes(12).toString("base64url")}`;
}

async function createInvoiceNumber(organizationId: string) {
  const rows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId));

  return `INV-${String(rows.length + 1).padStart(6, "0")}`;
}

export async function listInvoiceItems(invoiceId: string) {
  return db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceItems.sortOrder), asc(invoiceItems.createdAt));
}

async function insertInvoiceItems(
  invoiceId: string,
  items: InvoiceLineItemInput[],
  currencyCode: InvoiceCurrencyCode
) {
  if (items.length === 0) {
    return [];
  }

  return db
    .insert(invoiceItems)
    .values(
      items.map((item, index) => ({
        invoiceId,
        description: item.description.trim(),
        quantity: item.quantity.trim(),
        unitAmount: parseFiatAmount(item.unitAmount.trim(), currencyCode),
        sortOrder: index,
      }))
    )
    .returning();
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
      checkoutSessionId: invoices.checkoutSessionId,
      amount: invoices.amount,
      currencyCode: invoices.currencyCode,
      description: invoices.description,
      metadata: invoices.metadata,
      status: invoices.status,
      dueAt: invoices.dueAt,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      customerPublicId: customers.publicId,
      customerName: customers.name,
      customerEmail: customers.email,
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

export type InvoiceSortOrder = "asc" | "desc";

export type ListInvoicesQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "draft" | "open" | "paid" | "void";
  sortOrder?: InvoiceSortOrder;
};

export async function listInvoicesPaginated(
  organizationId: string,
  environment: Organization["environment"],
  query: ListInvoicesQuery = {},
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const search = query.search?.trim();
  const sortOrder = query.sortOrder ?? "desc";

  const envWhere = organizationEnvironmentWhere(
    invoices.organizationId,
    invoices.environment,
    organizationId,
    environment,
  );

  let whereClause: SQL | undefined = envWhere;

  if (search) {
    const pattern = `%${search}%`;
    whereClause = and(
      whereClause,
      or(
        ilike(invoices.publicId, pattern),
        ilike(invoices.invoiceNumber, pattern),
        ilike(invoices.description, pattern),
        ilike(customers.publicId, pattern),
        ilike(customers.name, pattern),
        ilike(customers.email, pattern),
      ),
    );
  }

  if (query.status) {
    whereClause = and(whereClause, eq(invoices.status, query.status));
  }

  const orderBy =
    sortOrder === "asc" ? asc(invoices.createdAt) : desc(invoices.createdAt);

  const baseQuery = db
    .select({
      id: invoices.id,
      publicId: invoices.publicId,
      organizationId: invoices.organizationId,
      customerId: invoices.customerId,
      checkoutSessionId: invoices.checkoutSessionId,
      amount: invoices.amount,
      currencyCode: invoices.currencyCode,
      description: invoices.description,
      metadata: invoices.metadata,
      status: invoices.status,
      dueAt: invoices.dueAt,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      customerPublicId: customers.publicId,
      customerName: customers.name,
      customerEmail: customers.email,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(whereClause)
    .orderBy(orderBy);

  const [rows, totalRows] = await Promise.all([
    baseQuery.limit(pageSize).offset(offset),
    db
      .select({ count: count() })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(whereClause),
  ]);

  return {
    invoices: await serializeInvoices(rows),
    total: totalRows[0]?.count ?? 0,
  };
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
    .select({
      publicId: customers.publicId,
      name: customers.name,
      email: customers.email,
    })
    .from(customers)
    .where(eq(customers.id, invoice.customerId))
    .limit(1);

  const items = await listInvoiceItems(invoice.id);

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
    customerName: customer?.name ?? null,
    customerEmail: customer?.email ?? null,
    items,
    checkoutUrl,
    checkoutSessionPublicId,
  };
}

export async function createInvoice(input: {
  organizationId: string;
  environment: Organization["environment"];
  customerId: string;
  amount?: string;
  currencyCode?: InvoiceCurrencyCode;
  description?: string | null;
  metadata?: Record<string, string> | null;
  dueInDays?: number;
  dueAt?: Date;
  items?: InvoiceLineItemInput[];
}) {
  const currencyCode = input.currencyCode ?? "USD";

  if (!isInvoiceCurrencyCode(currencyCode)) {
    throw new Error("Unsupported invoice currency");
  }

  const customer = await getCustomerByPublicId(input.customerId);

  if (!customer || customer.organizationId !== input.organizationId) {
    throw new Error("Customer not found");
  }

  if (customer.environment !== input.environment) {
    throw new Error("Customer environment does not match invoice environment");
  }

  const items = input.items ?? [];
  const amount =
    items.length > 0
      ? calculateInvoiceTotal(items, currencyCode)
      : input.amount
        ? parseFiatAmount(input.amount, currencyCode)
        : null;

  if (!amount) {
    throw new Error("Invoice amount or items are required");
  }

  const publicId = createInvoicePublicId();
  const invoiceNumber = await createInvoiceNumber(input.organizationId);
  const dueAt =
    input.dueAt ??
    (input.dueInDays !== undefined
      ? new Date(Date.now() + input.dueInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + DEFAULT_INVOICE_DUE_DAYS * 24 * 60 * 60 * 1000));

  const [invoice] = await db
    .insert(invoices)
    .values({
      publicId,
      invoiceNumber,
      organizationId: input.organizationId,
      environment: input.environment,
      customerId: customer.id,
      amount,
      currencyCode,
      description: input.description?.trim() || null,
      metadata: input.metadata ?? null,
      status: "draft",
      dueAt,
    })
    .returning();

  if (items.length > 0) {
    await insertInvoiceItems(invoice.id, items, currencyCode);
  } else if (input.description?.trim()) {
    await insertInvoiceItems(
      invoice.id,
      [
        {
          description: input.description.trim(),
          quantity: "1",
          unitAmount: amount,
        },
      ],
      currencyCode
    );
  }

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

  const { session, payment } = await createCheckoutSession({
    organizationId: invoice.organizationId,
    environment: invoice.environment,
    amount: PLACEHOLDER_PRICING_PAYMENT_AMOUNT,
    pricingCurrency: invoice.currencyCode,
    pricingAmount: invoice.amount,
    description: invoice.description,
    metadata: invoice.metadata ?? undefined,
    customerId: customer.publicId,
    sourceType: "invoice",
    invoiceId: invoice.id,
    expiresInMinutes: invoice.dueAt
      ? Math.max(
          MIN_PAYMENT_EXPIRY_MINUTES,
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

export async function buildInvoicePresentation(
  invoice: Invoice,
  options?: {
    checkoutUrl?: string | null;
  }
): Promise<InvoicePresentation> {
  const [organization] = await db
    .select({
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      logoInitials: organizations.logoInitials,
    })
    .from(organizations)
    .where(eq(organizations.id, invoice.organizationId))
    .limit(1);

  const [customer] = await db
    .select({
      name: customers.name,
      email: customers.email,
    })
    .from(customers)
    .where(eq(customers.id, invoice.customerId))
    .limit(1);

  const storedItems = await listInvoiceItems(invoice.id);
  const currencyCode = isInvoiceCurrencyCode(invoice.currencyCode)
    ? invoice.currencyCode
    : "USD";
  const paymentAssets = await getInvoicePaymentAssets(invoice);

  return {
    invoiceNumber: invoice.invoiceNumber ?? invoice.publicId,
    status: invoice.status,
    amount: invoice.amount,
    asset: currencyCode,
    currencyCode,
    allowedAssets: paymentAssets.allowed_assets.map((a) => a.asset_code),
    description: invoice.description,
    dueAt: invoice.dueAt,
    createdAt: invoice.createdAt,
    environmentLabel: getInvoiceEnvironmentLabel(invoice.environment),
    organization: organization ?? {
      name: "Merchant",
      logoUrl: null,
      logoInitials: "M",
    },
    customer: {
      name: customer?.name ?? null,
      email: customer?.email ?? null,
    },
    items: storedItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      lineAmount: lineItemAmount(
        {
          description: item.description,
          quantity: item.quantity,
          unitAmount: item.unitAmount,
        },
        currencyCode
      ),
    })),
    hostedInvoiceUrl: getHostedInvoiceUrl(invoice.publicId),
    checkoutUrl: options?.checkoutUrl ?? null,
  };
}

export async function sendInvoice(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"]
) {
  const detail = await getInvoiceDetail(publicId, organizationId, environment);

  if (!detail) {
    throw new Error("Invoice not found");
  }

  if (!detail.customerEmail) {
    throw new Error("Customer email is required to send an invoice");
  }

  let checkoutUrl = detail.checkoutUrl;
  let invoice = detail.invoice;

  if (invoice.status === "draft") {
    const finalized = await finalizeInvoice(publicId, organizationId, environment);
    invoice = finalized.invoice;
    checkoutUrl = finalized.checkoutUrl;
  }

  const presentation = await buildInvoicePresentation(invoice, { checkoutUrl });
  const delivery = await sendInvoiceEmail({
    to: detail.customerEmail,
    presentation,
    environment,
  });

  const [updated] = await db
    .update(invoices)
    .set({
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id))
    .returning();

  return {
    invoice: updated,
    checkoutUrl,
    emailDelivered: delivery.delivered,
    emailLogged: delivery.logged,
    presentation,
  };
}

export async function getPublicInvoiceDetail(publicId: string) {
  const invoice = await getInvoiceByPublicId(publicId);

  if (!invoice || invoice.status === "draft" || invoice.status === "void") {
    return null;
  }

  let checkoutUrl: string | null = null;
  let paymentPublicId: string | null = null;
  let allowedAssets: Array<{ asset_code: string; issuer_address: string | null }> =
    [];

  if (invoice.checkoutSessionId) {
    const { checkoutSessions } = await import("@/lib/db/schema");
    const [session] = await db
      .select({
        publicId: checkoutSessions.publicId,
        paymentId: checkoutSessions.paymentId,
      })
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, invoice.checkoutSessionId))
      .limit(1);

    if (session) {
      checkoutUrl = getCheckoutSessionUrl(session.publicId);

      const { payments } = await import("@/lib/db/schema");
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, session.paymentId))
        .limit(1);

      if (payment) {
        paymentPublicId = payment.publicId;
        const assets = serializePaymentAssets(payment);
        allowedAssets = assets.allowed_assets;
      }
    }
  }

  if (allowedAssets.length === 0) {
    const config = await getOrganizationDefaultAssetConfig(invoice.organizationId);
    allowedAssets = config.allowed_assets;
  }

  const presentation = await buildInvoicePresentation(invoice, { checkoutUrl });

  return {
    invoice,
    presentation,
    checkoutUrl,
    paymentPublicId,
    allowedAssets,
  };
}

export { buildInvoiceEmailText, mapInvoicePresentationToEmailProps, renderInvoiceEmailHtml };

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

    return;
  }

  if (payment.status === "expired") {
    return;
  }
}

export async function getInvoicePaymentAssets(invoice: Invoice) {
  if (invoice.checkoutSessionId) {
    const { checkoutSessions, payments } = await import("@/lib/db/schema");
    const [session] = await db
      .select({ paymentId: checkoutSessions.paymentId })
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, invoice.checkoutSessionId))
      .limit(1);

    if (session) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, session.paymentId))
        .limit(1);

      if (payment) {
        return serializePaymentAssets(payment);
      }
    }
  }

  return getOrganizationDefaultAssetConfig(invoice.organizationId);
}

function assertInvoiceEditable(status: Invoice["status"]) {
  if (status !== "draft" && status !== "open") {
    throw new Error("Only draft or unpaid invoices can be changed");
  }
}

export async function updateInvoice(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"],
  input: {
    description?: string | null;
    dueAt?: Date;
    metadata?: Record<string, string> | null;
    items?: InvoiceLineItemInput[];
  }
) {
  const invoice = await getInvoiceForOrganization(
    publicId,
    organizationId,
    environment
  );

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  assertInvoiceEditable(invoice.status);

  const currencyCode = isInvoiceCurrencyCode(invoice.currencyCode)
    ? invoice.currencyCode
    : "USD";

  let amount = invoice.amount;

  if (input.items) {
    if (input.items.length === 0) {
      throw new Error("At least one line item is required");
    }

    amount = calculateInvoiceTotal(input.items, currencyCode);
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
    await insertInvoiceItems(invoice.id, input.items, currencyCode);
  }

  const [updated] = await db
    .update(invoices)
    .set({
      amount,
      description:
        input.description !== undefined
          ? input.description?.trim() || null
          : invoice.description,
      metadata: input.metadata !== undefined ? input.metadata : invoice.metadata,
      dueAt: input.dueAt ?? invoice.dueAt,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id))
    .returning();

  return updated;
}

export async function changeInvoiceCustomer(
  publicId: string,
  organizationId: string,
  environment: Organization["environment"],
  customerPublicId: string
) {
  const invoice = await getInvoiceForOrganization(
    publicId,
    organizationId,
    environment
  );

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  assertInvoiceEditable(invoice.status);

  const customer = await getCustomerByPublicId(customerPublicId);

  if (!customer || customer.organizationId !== organizationId) {
    throw new Error("Customer not found");
  }

  if (customer.environment !== environment) {
    throw new Error("Customer environment does not match invoice environment");
  }

  const [updated] = await db
    .update(invoices)
    .set({
      customerId: customer.id,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id))
    .returning();

  return updated;
}

export async function markInvoiceAsPaid(
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

  if (invoice.status !== "open") {
    throw new Error("Only open invoices can be marked as paid");
  }

  const paidAt = new Date();
  const [updated] = await db
    .update(invoices)
    .set({
      status: "paid",
      paidAt,
      updatedAt: paidAt,
    })
    .where(eq(invoices.id, invoice.id))
    .returning();

  return updated;
}

export async function deleteInvoice(
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
    throw new Error("Only draft invoices can be deleted");
  }

  await db.delete(invoices).where(eq(invoices.id, invoice.id));

  return { deleted: true, publicId };
}

export function serializeInvoice(
  invoice: {
    publicId: string;
    invoiceNumber?: string | null;
    status: Invoice["status"];
    amount: string;
    currencyCode?: string;
    description: string | null;
    metadata: Record<string, string> | null;
    dueAt: Date | null;
    paidAt: Date | null;
    sentAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    customerPublicId?: string | null;
  },
  options?: {
    checkoutUrl?: string | null;
    checkoutSessionPublicId?: string | null;
    items?: Array<{
      description: string;
      quantity: string;
      unitAmount: string;
    }>;
    hostedInvoiceUrl?: string | null;
    settlementAsset?: string | null;
    allowedAssets?: string[] | null;
    customerName?: string | null;
    customerEmail?: string | null;
  }
) {
  return {
    id: invoice.publicId,
    object: "invoice",
    invoice_number: invoice.invoiceNumber ?? invoice.publicId,
    status: invoice.status,
    amount: invoice.amount,
    currency_code: invoice.currencyCode ?? "USD",
    settlement_asset: options?.settlementAsset
      ? { asset_code: options.settlementAsset, issuer_address: null }
      : null,
    allowed_assets:
      options?.allowedAssets?.map((code) => ({
        asset_code: code,
        issuer_address: null,
      })) ?? [],
    description: invoice.description,
    metadata: invoice.metadata,
    customer_id: invoice.customerPublicId ?? null,
    customer_name: options?.customerName ?? null,
    customer_email: options?.customerEmail ?? null,
    checkout_session_id: options?.checkoutSessionPublicId ?? null,
    checkout_url: options?.checkoutUrl ?? null,
    hosted_invoice_url:
      options?.hostedInvoiceUrl ?? getHostedInvoiceUrl(invoice.publicId),
    items:
      options?.items?.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_amount: item.unitAmount,
      })) ?? [],
    due_at: invoice.dueAt,
    paid_at: invoice.paidAt,
    sent_at: invoice.sentAt ?? null,
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

  const { checkoutSessions } = await import("@/lib/db/schema");
  const sessionRows =
    sessionIds.length > 0
      ? await db
          .select({ id: checkoutSessions.id, publicId: checkoutSessions.publicId })
          .from(checkoutSessions)
          .where(inArray(checkoutSessions.id, sessionIds))
      : [];

  const sessionMap = new Map(
    sessionRows.map((row) => [row.id, row.publicId] as const)
  );

  return rows.map((row) => {
    const sessionPublicId = row.checkoutSessionId
      ? (sessionMap.get(row.checkoutSessionId) ?? null)
      : null;

    return serializeInvoice(
      { ...row, customerPublicId: row.customerPublicId },
      {
        checkoutSessionPublicId: sessionPublicId,
        checkoutUrl: sessionPublicId ? getCheckoutSessionUrl(sessionPublicId) : null,
        hostedInvoiceUrl: getHostedInvoiceUrl(row.publicId),
        customerName: row.customerName ?? null,
        customerEmail: row.customerEmail ?? null,
      }
    );
  });
}
