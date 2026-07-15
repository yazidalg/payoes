import { getDocsUrl } from "@/lib/docs/url";

export const SITE_HOST = "payoes.com";

const docsUrl = getDocsUrl();

export const HOMEPAGE_UTM_PARAMS = {
  utm_source: "Marketing",
  utm_medium: "Homepage",
  utm_campaign: "payoes",
} as const;

export const HERO_ROTATING_WORDS = ["Platform", "Product", "Agency", "Store", "Startup", "SaaS"] as const;

export const HERO_CONTENT = {
  titlePrefix: "Run your ",
  titleSuffix: " onchain.",
  rotatingWords: HERO_ROTATING_WORDS,
  description: "Accept borderless payments with near-zero fees, instant settlement, and a developer-first payment infrastructure built on Stellar.",
  primaryCta: { label: "Start for free", href: "/register" },
  githubCta: {
    label: "Star on GitHub",
    href: "https://github.com/payoesteam/payoes",
  },
  learnMoreHref: docsUrl,
};

export const FEATURES_SECTION_CONTENT = {
  badge: "What is Payoes?",
  title: "Payment infrastructure built for Stellar",
  description: "Accept crypto payments with hosted checkout, payment links, and invoices. Subscribe to webhooks and track analytics from one dashboard.",
};

export const CTA_CONTENT = {
  title: "Start accepting Stellar payments today",
  subtitle: "See why teams choose Payoes for stablecoin checkout, payment links, and developer-first APIs.",
  primaryCta: { label: "Start for free", href: "/register" },
  secondaryCta: {
    label: "View documentation",
    href: docsUrl,
    external: true,
  },
};

export const STELLAR_WORDMARKS = ["Stellar", "Soroban", "USDC", "XLM", "Freighter", "xBull", "Albedo", "LOBSTR", "Persona"];
