import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member"]);
export const environmentModeEnum = pgEnum("environment_mode", [
  "sandbox",
  "production",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "expired",
]);

export const paymentAssetEnum = pgEnum("payment_asset", ["USDC", "XLM"]);

export const organizationAssets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  assetCode: text("asset_code").notNull(),
  issuerAddress: text("issuer_address"),
  displayName: text("display_name").notNull(),
  isVerified: integer("is_verified").notNull().default(1),
  isEnabled: integer("is_enabled").notNull().default(1),
  isDefault: integer("is_default").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** @deprecated Use organizationAssets */
export const paymentMethods = organizationAssets;

export const paymentSourceTypeEnum = pgEnum("payment_source_type", [
  "direct",
  "checkout_session",
  "payment_link",
  "invoice",
]);

export const checkoutSessionStatusEnum = pgEnum("checkout_session_status", [
  "open",
  "complete",
  "expired",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "open",
  "paid",
  "void",
]);

export const webhookEventEnum = pgEnum("webhook_event", [
  "payment.created",
  "payment.completed",
  "payment.failed",
  "payment.expired",
  "webhook.test",
]);

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "delivered",
  "failed",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",
  "pending",
  "verified",
  "expired",
  "rejected",
]);

export const accountTypeEnum = pgEnum("account_type", ["personal", "business"]);

export const providerStatusEnum = pgEnum("provider_status", [
  "created",
  "pending",
  "approved",
  "declined",
  "needs_review",
]);

export const authProviderEnum = pgEnum("auth_provider", ["credentials", "google"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  image: text("image"),
  authProvider: authProviderEnum("auth_provider")
    .notNull()
    .default("credentials"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailVerificationOtps = pgTable("email_verification_otps", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    website: text("website"),
    description: text("description"),
    logoUrl: text("logo_url"),
    logoInitials: text("logo_initials").notNull(),
    slug: text("slug").notNull().unique(),
    environment: environmentModeEnum("environment").notNull().default("sandbox"),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("unverified"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verificationExpiresAt: timestamp("verification_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("organizations_slug_idx").on(table.slug)]
);

export const organizationVerificationApplications = pgTable(
  "organization_verification_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    accountType: accountTypeEnum("account_type").notNull().default("personal"),
    displayName: text("display_name").notNull(),
    registrationNumber: text("registration_number"),
    country: text("country").notNull(),
    businessDescription: text("business_description"),
    provider: text("provider").notNull().default("persona"),
    providerInquiryId: text("provider_inquiry_id"),
    providerStatus: providerStatusEnum("provider_status").notNull().default("created"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_verification_applications_org_idx").on(table.organizationId),
  ]
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_members_org_user_idx").on(
      table.organizationId,
      table.userId
    ),
  ]
);

export const organizationInvites = pgTable(
  "organization_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRoleEnum("role").notNull(),
    token: text("token").notNull().unique(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_invites_org_email_pending_idx").on(
      table.organizationId,
      table.email
    ),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  emailVerificationOtps: many(emailVerificationOtps),
}));

export const emailVerificationOtpsRelations = relations(
  emailVerificationOtps,
  ({ one }) => ({
    user: one(users, {
      fields: [emailVerificationOtps.userId],
      references: [users.id],
    }),
  })
);

export const organizationSettlementWallets = pgTable(
  "organization_receiving_wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    environment: environmentModeEnum("environment").notNull(),
    stellarAddress: text("stellar_address").notNull(),
    acceptedAssets: jsonb("accepted_assets")
      .$type<string[]>()
      .notNull()
      .default(["USDC", "XLM"]),
    walletProvider: text("wallet_provider"),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("organization_receiving_wallets_org_env_idx").on(
      table.organizationId,
      table.environment
    ),
  ]
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invites: many(organizationInvites),
  settlementWallets: many(organizationSettlementWallets),
  paymentMethods: many(paymentMethods),
  customers: many(customers),
  verificationApplications: many(organizationVerificationApplications),
}));

export const organizationAssetsRelations = relations(organizationAssets, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationAssets.organizationId],
    references: [organizations.id],
  }),
}));

export const organizationVerificationApplicationsRelations = relations(
  organizationVerificationApplications,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationVerificationApplications.organizationId],
      references: [organizations.id],
    }),
  })
);

export const organizationSettlementWalletsRelations = relations(
  organizationSettlementWallets,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationSettlementWallets.organizationId],
      references: [organizations.id],
    }),
  })
);

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  })
);

export const organizationInvitesRelations = relations(
  organizationInvites,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationInvites.organizationId],
      references: [organizations.id],
    }),
    inviter: one(users, {
      fields: [organizationInvites.invitedBy],
      references: [users.id],
    }),
  })
);

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type OrganizationInvite = typeof organizationInvites.$inferSelect;
export type MemberRole = OrganizationMember["role"];
export type VerificationStatus = Organization["verificationStatus"];
export type OrganizationVerificationApplication =
  typeof organizationVerificationApplications.$inferSelect;
export type OrganizationSettlementWallet =
  typeof organizationSettlementWallets.$inferSelect;

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    environment: environmentModeEnum("environment").notNull().default("sandbox"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    scopes: jsonb("scopes").$type<string[]>().notNull().default(["apis.all"]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("api_keys_prefix_idx").on(table.keyPrefix),
  ]
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    environment: environmentModeEnum("environment").notNull().default("sandbox"),
    email: text("email"),
    name: text("name"),
    primaryStellarAddress: text("primary_stellar_address"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("customers_public_id_idx").on(table.publicId),
    uniqueIndex("customers_org_env_wallet_idx").on(
      table.organizationId,
      table.environment,
      table.primaryStellarAddress
    ),
  ]
);

export const paymentLinks = pgTable(
  "payment_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    environment: environmentModeEnum("environment").notNull().default("sandbox"),
    amount: text("amount").notNull(),
    currencyCode: text("currency_code"),
    settlementAsset: text("settlement_asset").notNull(),
    settlementAssetIssuer: text("settlement_asset_issuer"),
    allowedAssets: jsonb("allowed_assets")
      .$type<Array<{ asset_code: string; issuer_address: string | null }>>()
      .notNull(),
    description: text("description"),
    productName: text("product_name"),
    productDescription: text("product_description"),
    customerCollection: jsonb("customer_collection")
      .$type<{
        collect_customer_name: boolean;
        collect_business_name: boolean;
        collect_customer_address: boolean;
        require_phone_number: boolean;
      }>()
      .notNull()
      .default({
        collect_customer_name: false,
        collect_business_name: false,
        collect_customer_address: false,
        require_phone_number: false,
      }),
    active: integer("active").notNull().default(1),
    metadata: jsonb("metadata").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("payment_links_public_id_idx").on(table.publicId)]
);

export const paymentLinkItems = pgTable("payment_link_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentLinkId: uuid("payment_link_id")
    .notNull()
    .references(() => paymentLinks.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: text("quantity").notNull().default("1"),
  unitAmount: text("unit_amount").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    sourceType: paymentSourceTypeEnum("source_type").notNull().default("direct"),
    paymentLinkId: uuid("payment_link_id").references(() => paymentLinks.id, {
      onDelete: "set null",
    }),
    invoiceId: uuid("invoice_id"),
    environment: environmentModeEnum("environment").notNull().default("sandbox"),
    amount: text("amount").notNull(),
    pricingCurrency: text("pricing_currency"),
    pricingAmount: text("pricing_amount"),
    quotedPaidAmount: text("quoted_paid_amount"),
    quotedSettlementAmount: text("quoted_settlement_amount"),
    quoteRate: text("quote_rate"),
    settlementQuoteRate: text("settlement_quote_rate"),
    quoteExpiresAt: timestamp("quote_expires_at", { withTimezone: true }),
    settlementAsset: text("settlement_asset").notNull(),
    settlementAssetIssuer: text("settlement_asset_issuer"),
    allowedAssets: jsonb("allowed_assets")
      .$type<Array<{ asset_code: string; issuer_address: string | null }>>()
      .notNull(),
    paidAsset: text("paid_asset"),
    paidAssetIssuer: text("paid_asset_issuer"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    receivingAddress: text("receiving_address").notNull(),
    payerAddress: text("payer_address"),
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, string>>(),
    memo: text("memo"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    txHash: text("tx_hash"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("payments_public_id_idx").on(table.publicId)]
);

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    status: checkoutSessionStatusEnum("status").notNull().default("open"),
    successUrl: text("success_url"),
    cancelUrl: text("cancel_url"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("checkout_sessions_public_id_idx").on(table.publicId)]
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    environment: environmentModeEnum("environment").notNull().default("sandbox"),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    checkoutSessionId: uuid("checkout_session_id"),
    amount: text("amount").notNull(),
    currencyCode: text("currency_code").notNull().default("USD"),
    description: text("description"),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    metadata: jsonb("metadata").$type<Record<string, string>>(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    invoiceNumber: text("invoice_number"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("invoices_public_id_idx").on(table.publicId)]
);

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: text("quantity").notNull().default("1"),
  unitAmount: text("unit_amount").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  environment: environmentModeEnum("environment").notNull().default("sandbox"),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: jsonb("events").$type<string[]>().notNull().default([]),
  enabled: integer("enabled").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  webhookEndpointId: uuid("webhook_endpoint_id")
    .notNull()
    .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
  event: webhookEventEnum("event").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: webhookDeliveryStatusEnum("status").notNull().default("pending"),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  attempts: integer("attempts").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const apiLogs = pgTable("api_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  environment: environmentModeEnum("environment").notNull().default("sandbox"),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
    onDelete: "set null",
  }),
  method: text("method").notNull(),
  path: text("path").notNull(),
  statusCode: integer("status_code").notNull(),
  durationMs: integer("duration_ms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.organizationId],
    references: [organizations.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
  payments: many(payments),
}));

export const paymentLinksRelations = relations(paymentLinks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [paymentLinks.organizationId],
    references: [organizations.id],
  }),
  payments: many(payments),
  items: many(paymentLinkItems),
}));

export const paymentLinkItemsRelations = relations(paymentLinkItems, ({ one }) => ({
  paymentLink: one(paymentLinks, {
    fields: [paymentLinkItems.paymentLinkId],
    references: [paymentLinks.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  paymentLink: one(paymentLinks, {
    fields: [payments.paymentLinkId],
    references: [paymentLinks.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  checkoutSession: one(checkoutSessions, {
    fields: [payments.id],
    references: [checkoutSessions.paymentId],
  }),
}));

export const checkoutSessionsRelations = relations(checkoutSessions, ({ one }) => ({
  organization: one(organizations, {
    fields: [checkoutSessions.organizationId],
    references: [organizations.id],
  }),
  payment: one(payments, {
    fields: [checkoutSessions.paymentId],
    references: [payments.id],
  }),
  customer: one(customers, {
    fields: [checkoutSessions.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [checkoutSessions.id],
    references: [invoices.checkoutSessionId],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  checkoutSession: one(checkoutSessions, {
    fields: [invoices.checkoutSessionId],
    references: [checkoutSessions.id],
  }),
}));

export const webhookEndpointsRelations = relations(
  webhookEndpoints,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [webhookEndpoints.organizationId],
      references: [organizations.id],
    }),
    deliveries: many(webhookDeliveries),
  })
);

export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    endpoint: one(webhookEndpoints, {
      fields: [webhookDeliveries.webhookEndpointId],
      references: [webhookEndpoints.id],
    }),
  })
);

export const apiLogsRelations = relations(apiLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiLogs.organizationId],
    references: [organizations.id],
  }),
  apiKey: one(apiKeys, {
    fields: [apiLogs.apiKeyId],
    references: [apiKeys.id],
  }),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type PaymentLink = typeof paymentLinks.$inferSelect;
export type PaymentLinkItem = typeof paymentLinkItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type CheckoutSession = typeof checkoutSessions.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type ApiLog = typeof apiLogs.$inferSelect;
