import type { IntegrationCatalogItem, IntegrationProviderId } from "./types";

export const INTEGRATION_CATALOG: IntegrationCatalogItem[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Create Payoes payments when new Shopify orders are placed.",
    href: "/dashboard/integrations/shopify",
    docsPath: "/guides/integrations/shopify",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Create Payoes payments when new WooCommerce orders are placed.",
    href: "/dashboard/integrations/woocommerce",
    docsPath: "/guides/integrations/woocommerce",
  },
];

export function getIntegrationCatalogItem(provider: IntegrationProviderId) {
  return INTEGRATION_CATALOG.find((item) => item.id === provider) ?? null;
}
