import { getDocsUrl } from "@/lib/docs/url";

export const SITE_HOST = "payoes.com";

const docsUrl = getDocsUrl();

export const HOMEPAGE_UTM_PARAMS = {
  utm_source: "Marketing",
  utm_medium: "Homepage",
  utm_campaign: "payoes",
} as const;

export const HERO_CONTENT = {
  title: "Turn checkout into revenue",
  description:
    "Payoes is the modern payment platform for stablecoin checkout, payment links, and subscriptions on Stellar.",
  primaryCta: { label: "Start for free", href: "/register" },
  learnMoreHref: docsUrl,
};

export const FEATURES_SECTION_CONTENT = {
  badge: "What is Payoes?",
  title: "Powerful features for modern payment teams",
  description:
    "Payoes is more than a checkout page. We've built a suite of powerful features that give your payments superpowers.",
};

export const CTA_CONTENT = {
  title: "Start accepting Stellar payments today",
  subtitle:
    "See why teams choose Payoes for stablecoin checkout, payment links, and developer-first APIs.",
  primaryCta: { label: "Start for free", href: "/register" },
  secondaryCta: {
    label: "View documentation",
    href: docsUrl,
    external: true,
  },
  logosCopy: "Works with the Stellar assets and wallets you already use",
};

export const STELLAR_WORDMARKS = [
  "Stellar",
  "Soroban",
  "USDC",
  "XLM",
  "Freighter",
  "xBull",
  "Albedo",
  "LOBSTR",
  "Persona",
];
