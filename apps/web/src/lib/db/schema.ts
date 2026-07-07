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

export const webhookEventEnum = pgEnum("webhook_event", [
  "payment.created",
  "payment.completed",
  "payment.failed",
  "payment.expired",
]);

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "delivered",
  "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("organizations_slug_idx").on(table.slug)]
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

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
}));

export const organizationReceivingWallets = pgTable(
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
  receivingWallets: many(organizationReceivingWallets),
  customers: many(customers),
}));

export const organizationReceivingWalletsRelations = relations(
  organizationReceivingWallets,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationReceivingWallets.organizationId],
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

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type OrganizationReceivingWallet =
  typeof organizationReceivingWallets.$inferSelect;

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
    environment: environmentModeEnum("environment").notNull().default("sandbox"),
    amount: text("amount").notNull(),
    asset: paymentAssetEnum("asset").notNull(),
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

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const apiLogs = pgTable("api_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
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

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
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
export type Payment = typeof payments.$inferSelect;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type ApiLog = typeof apiLogs.$inferSelect;
