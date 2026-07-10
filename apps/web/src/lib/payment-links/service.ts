import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizations,
  paymentLinkItems,
  paymentLinks,
  type Organization,
  type PaymentLink,
} from "@/lib/db/schema";
import { DEFAULT_AUTH_URL } from "@/constants/app";
import type { AllowedAsset } from "@/lib/assets/types";
import { resolveAssetConfig } from "@/lib/assets/config";
import {
  dbAllowedAssets,
  serializePaymentLinkAssets,
} from "@/lib/assets/serialize";
import {
  calculateInvoiceTotal,
  lineItemAmount,
  parseFiatAmount,
  type InvoiceLineItemInput,
} from "@/lib/invoices/amount";
import {
  isInvoiceCurrencyCode,
  type InvoiceCurrencyCode,
} from "@/lib/invoices/currencies";
import { PLACEHOLDER_PRICING_PAYMENT_AMOUNT } from "@/constants/payments/defaults";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import { createPayment, getCheckoutUrl } from "@/lib/payments/service";
import { paymentLinkCustomerInputSchema } from "@/lib/payment-links/schemas";
import {
  DEFAULT_PAYMENT_LINK_CUSTOMER_COLLECTION,
  hasCustomerCollection,
  normalizePaymentLinkCustomerCollection,
  type PaymentLinkCustomerCollection,
  type PaymentLinkCustomerInput,
  type PaymentLinkLineItem,
} from "@/lib/payment-links/types";

function createLinkPublicId() {
  return `plink_${randomBytes(12).toString("base64url")}`;
}

export function getPaymentLinkUrl(publicId: string) {
  const baseUrl = process.env.AUTH_URL ?? DEFAULT_AUTH_URL;
  return `${baseUrl}/l/${publicId}`;
}

function serializeLineItems(
  items: Array<{
    description: string;
    quantity: string;
    unitAmount: string;
  }>,
  currencyCode: InvoiceCurrencyCode
): PaymentLinkLineItem[] {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unit_amount: item.unitAmount,
    line_amount: lineItemAmount(
      {
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
      },
      currencyCode
    ),
  }));
}

export async function listPaymentLinkItems(paymentLinkId: string) {
  return db
    .select()
    .from(paymentLinkItems)
    .where(eq(paymentLinkItems.paymentLinkId, paymentLinkId))
    .orderBy(asc(paymentLinkItems.sortOrder), asc(paymentLinkItems.createdAt));
}

async function insertPaymentLinkItems(
  paymentLinkId: string,
  items: InvoiceLineItemInput[],
  currencyCode: InvoiceCurrencyCode
) {
  if (items.length === 0) {
    return [];
  }

  return db
    .insert(paymentLinkItems)
    .values(
      items.map((item, index) => ({
        paymentLinkId,
        description: item.description.trim(),
        quantity: item.quantity.trim(),
        unitAmount: parseFiatAmount(item.unitAmount.trim(), currencyCode),
        sortOrder: index,
      }))
    )
    .returning();
}

function buildCustomerMetadata(
  input: PaymentLinkCustomerInput | undefined,
  collection: PaymentLinkCustomerCollection
) {
  if (!input || !hasCustomerCollection(collection)) {
    return undefined;
  }

  const metadata: Record<string, string> = {};

  if (collection.collect_customer_name && input.customer_name?.trim()) {
    metadata.customer_name = input.customer_name.trim();
  }

  if (collection.collect_business_name && input.business_name?.trim()) {
    metadata.business_name = input.business_name.trim();
  }

  if (collection.require_phone_number && input.phone_number?.trim()) {
    metadata.phone_number = input.phone_number.trim();
  }

  if (collection.collect_customer_address) {
    const addressFields = [
      ["address_line1", input.address_line1],
      ["address_line2", input.address_line2],
      ["address_city", input.address_city],
      ["address_state", input.address_state],
      ["address_postal_code", input.address_postal_code],
      ["address_country", input.address_country],
    ] as const;

    for (const [key, value] of addressFields) {
      if (value?.trim()) {
        metadata[key] = value.trim();
      }
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function validateCustomerInput(
  input: PaymentLinkCustomerInput | undefined,
  collection: PaymentLinkCustomerCollection
) {
  if (!hasCustomerCollection(collection)) {
    return;
  }

  const parsed = paymentLinkCustomerInputSchema.safeParse(input ?? {});

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid customer details");
  }

  const data = parsed.data;

  if (collection.collect_customer_name && !data.customer_name?.trim()) {
    throw new Error("Customer name is required");
  }

  if (collection.collect_business_name && !data.business_name?.trim()) {
    throw new Error("Business name is required");
  }

  if (collection.require_phone_number && !data.phone_number?.trim()) {
    throw new Error("Phone number is required");
  }

  if (collection.collect_customer_address) {
    if (!data.address_line1?.trim()) {
      throw new Error("Address line 1 is required");
    }

    if (!data.address_city?.trim()) {
      throw new Error("City is required");
    }

    if (!data.address_country?.trim()) {
      throw new Error("Country is required");
    }
  }
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

export type PaymentLinkSortOrder = "asc" | "desc";

export type ListPaymentLinksQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "inactive";
  sortOrder?: PaymentLinkSortOrder;
};

export async function listPaymentLinksPaginated(
  organizationId: string,
  environment: Organization["environment"],
  query: ListPaymentLinksQuery = {},
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const search = query.search?.trim();
  const sortOrder = query.sortOrder ?? "desc";

  const envWhere = organizationEnvironmentWhere(
    paymentLinks.organizationId,
    paymentLinks.environment,
    organizationId,
    environment,
  );

  let whereClause: SQL | undefined = envWhere;

  if (search) {
    const pattern = `%${search}%`;
    whereClause = and(
      whereClause,
      or(
        ilike(paymentLinks.publicId, pattern),
        ilike(paymentLinks.productName, pattern),
        ilike(paymentLinks.description, pattern),
      ),
    );
  }

  if (query.status === "active") {
    whereClause = and(whereClause, eq(paymentLinks.active, 1));
  } else if (query.status === "inactive") {
    whereClause = and(whereClause, eq(paymentLinks.active, 0));
  }

  const orderBy =
    sortOrder === "asc"
      ? asc(paymentLinks.createdAt)
      : desc(paymentLinks.createdAt);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(paymentLinks)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(paymentLinks)
      .where(whereClause),
  ]);

  const linkIds = rows.map((row) => row.id);
  const itemCounts =
    linkIds.length > 0
      ? await db
          .select({
            paymentLinkId: paymentLinkItems.paymentLinkId,
            count: count(),
          })
          .from(paymentLinkItems)
          .where(inArray(paymentLinkItems.paymentLinkId, linkIds))
          .groupBy(paymentLinkItems.paymentLinkId)
      : [];

  const itemCountMap = new Map(
    itemCounts.map((row) => [row.paymentLinkId, row.count] as const),
  );

  const payment_links = await Promise.all(
    rows.map(async (link) => ({
      ...(await serializePaymentLink(link)),
      item_count: itemCountMap.get(link.id) ?? 0,
    })),
  );

  return {
    payment_links,
    total: totalRows[0]?.count ?? 0,
  };
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

export async function getPublicPaymentLinkDetail(publicId: string) {
  const link = await getPaymentLinkByPublicId(publicId);

  if (!link || !link.active) {
    return null;
  }

  const [organization] = await db
    .select({
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      logoInitials: organizations.logoInitials,
    })
    .from(organizations)
    .where(eq(organizations.id, link.organizationId))
    .limit(1);

  if (!organization) {
    return null;
  }

  const customerCollection = normalizePaymentLinkCustomerCollection(
    link.customerCollection
  );

  const dbItems = await listPaymentLinkItems(link.id);
  const currencyCode = link.currencyCode ?? null;

  const items =
    currencyCode && isInvoiceCurrencyCode(currencyCode)
      ? serializeLineItems(
          dbItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
          })),
          currencyCode
        )
      : dbItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_amount: item.unitAmount,
          line_amount: item.unitAmount,
        }));

  return {
    id: link.publicId,
    amount: link.amount,
    currency_code: currencyCode,
    settlement_asset: {
      asset_code: link.settlementAsset,
      issuer_address: link.settlementAssetIssuer,
    },
    allowed_assets: link.allowedAssets ?? [],
    items,
    product_name: link.productName,
    product_description: link.productDescription,
    description: link.description,
    customer_collection: customerCollection,
    requires_customer_details: hasCustomerCollection(customerCollection),
    environment: link.environment,
    organization,
  };
}

export async function createPaymentLink(input: {
  organizationId: string;
  environment: Organization["environment"];
  currencyCode: InvoiceCurrencyCode;
  items: InvoiceLineItemInput[];
  settlementAsset?: AllowedAsset | null;
  allowedAssets?: AllowedAsset[] | null;
  description?: string | null;
  customerCollection?: PaymentLinkCustomerCollection;
  metadata?: Record<string, string> | null;
}) {
  if (!isInvoiceCurrencyCode(input.currencyCode)) {
    throw new Error("Unsupported payment link currency");
  }

  const amount = calculateInvoiceTotal(input.items, input.currencyCode);
  const assetConfig = await resolveAssetConfig({
    organizationId: input.organizationId,
    settlementAsset: input.settlementAsset,
    allowedAssets: input.allowedAssets,
  });

  const publicId = createLinkPublicId();
  const firstItem = input.items[0];

  const [link] = await db
    .insert(paymentLinks)
    .values({
      publicId,
      organizationId: input.organizationId,
      environment: input.environment,
      amount,
      currencyCode: input.currencyCode,
      settlementAsset: assetConfig.settlement_asset.asset_code,
      settlementAssetIssuer: assetConfig.settlement_asset.issuer_address,
      allowedAssets: dbAllowedAssets(assetConfig.allowed_assets),
      productName: firstItem?.description.trim() || null,
      productDescription: null,
      description: input.description?.trim() || null,
      customerCollection: normalizePaymentLinkCustomerCollection(
        input.customerCollection
      ),
      metadata: input.metadata ?? null,
      active: 1,
    })
    .returning();

  await insertPaymentLinkItems(link.id, input.items, input.currencyCode);

  return link;
}

export async function startCheckoutFromPaymentLink(
  publicId: string,
  customerInput?: PaymentLinkCustomerInput
) {
  const link = await getPaymentLinkByPublicId(publicId);

  if (!link || !link.active) {
    return null;
  }

  const customerCollection = normalizePaymentLinkCustomerCollection(
    link.customerCollection
  );

  validateCustomerInput(customerInput, customerCollection);

  const customerMetadata = buildCustomerMetadata(customerInput, customerCollection);
  const metadata = {
    ...(link.metadata ?? {}),
    ...(customerMetadata ?? {}),
    payment_link_id: link.publicId,
  };

  const usesFiatPricing = Boolean(link.currencyCode);

  const payment = await createPayment({
    organizationId: link.organizationId,
    environment: link.environment,
    amount: usesFiatPricing ? PLACEHOLDER_PRICING_PAYMENT_AMOUNT : link.amount,
    pricingCurrency: usesFiatPricing ? link.currencyCode : null,
    pricingAmount: usesFiatPricing ? link.amount : null,
    settlementAsset: {
      asset_code: link.settlementAsset,
      issuer_address: link.settlementAssetIssuer,
    },
    allowedAssets: link.allowedAssets ?? [],
    description: link.productName ?? link.description,
    metadata,
    sourceType: "payment_link",
    paymentLinkId: link.id,
  });

  await db
    .update(paymentLinks)
    .set({ updatedAt: new Date() })
    .where(eq(paymentLinks.id, link.id));

  return { link, payment, checkoutUrl: getCheckoutUrl(payment.publicId) };
}

export async function serializePaymentLink(
  link: PaymentLink,
  options?: { includeItems?: boolean }
) {
  const currencyCode = link.currencyCode ?? null;
  let items: PaymentLinkLineItem[] | undefined;

  if (options?.includeItems) {
    const dbItems = await listPaymentLinkItems(link.id);

    items =
      currencyCode && isInvoiceCurrencyCode(currencyCode)
        ? serializeLineItems(
            dbItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmount: item.unitAmount,
            })),
            currencyCode
          )
        : dbItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_amount: item.unitAmount,
            line_amount: item.unitAmount,
          }));
  }

  return {
    id: link.publicId,
    object: "payment_link",
    amount: link.amount,
    currency_code: currencyCode,
    ...serializePaymentLinkAssets(link),
    product_name: link.productName,
    product_description: link.productDescription,
    items,
    description: link.description,
    customer_collection: normalizePaymentLinkCustomerCollection(
      link.customerCollection
    ),
    active: Boolean(link.active),
    metadata: link.metadata,
    url: getPaymentLinkUrl(link.publicId),
    environment: link.environment,
    created_at: link.createdAt,
    updated_at: link.updatedAt,
  };
}

export {
  DEFAULT_PAYMENT_LINK_CUSTOMER_COLLECTION,
  hasCustomerCollection,
  normalizePaymentLinkCustomerCollection,
};
export type {
  PaymentLinkCustomerCollection,
  PaymentLinkCustomerInput,
  PaymentLinkLineItem,
  PaymentLinkPresentation,
} from "@/lib/payment-links/types";
