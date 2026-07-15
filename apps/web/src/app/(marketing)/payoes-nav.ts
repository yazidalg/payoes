"use client";

import {
  ArrowLeftRight,
  Link2,
  QrCode,
  Receipt,
  Webhook,
} from "lucide-react";
import type { NavItem } from "@dub/ui";
import { PayoesProductContent } from "@/ui/marketing/payoes-product-content";
import { getDocsUrl } from "@/lib/docs/url";

const PAYOES_PRODUCT_CHILD_ITEMS = [
  {
    title: "Crypto payments",
    description: "Accept USDC, XLM, and any Stellar asset",
    href: "/features/payments",
    icon: ArrowLeftRight,
  },
  {
    title: "Checkout & payment links",
    description: "Hosted checkout pages and shareable links",
    href: "/features/checkout",
    icon: Link2,
  },
  {
    title: "Invoicing",
    description: "Bill customers with hosted invoices",
    href: "/features/invoicing",
    icon: Receipt,
  },
  {
    title: "QR code checkout",
    description: "Free QR codes for every payment link",
    href: "/features/qr-checkout",
    icon: QrCode,
  },
  {
    title: "Webhooks",
    description: "HMAC-signed events with automatic retries",
    href: "/features/webhooks",
    icon: Webhook,
  },
];

export const payoesNavItems: NavItem[] = [
  {
    name: "Product",
    content: PayoesProductContent,
    childItems: PAYOES_PRODUCT_CHILD_ITEMS,
    segments: ["/features"],
  },
  {
    name: "Developers",
    href: "/developers",
    segments: ["/developers"],
  },
  {
    name: "Docs",
    href: getDocsUrl(),
    target: "_blank",
    external: true,
  },
  {
    name: "Pricing",
    href: "/pricing",
    segments: ["/pricing"],
  },
];
