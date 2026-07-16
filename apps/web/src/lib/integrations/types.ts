import type { OrganizationIntegration } from "@/lib/db/schema";

export type IntegrationProviderId = "shopify" | "woocommerce";
export type IntegrationStatusValue =
  OrganizationIntegration["status"];

export type IntegrationCatalogItem = {
  id: IntegrationProviderId;
  name: string;
  description: string;
  href: string;
  docsPath: string;
};

export type IntegrationListItem = IntegrationCatalogItem & {
  integration: OrganizationIntegration | null;
};

export type ShopifyCredentials = {
  accessToken: string;
};

export type WooCommerceCredentials = {
  consumerKey: string;
  consumerSecret: string;
};

export type IntegrationOrderInput = {
  externalOrderId: string;
  amount: string;
  currency: string;
  description?: string | null;
  customerEmail?: string | null;
};
