"use client";

import {
  InvoiceGraphic,
  PaymentLinksGraphic,
  PaymentsGraphic,
  QRGraphic,
  WebhooksGraphic,
} from "@/app/(marketing)/feature-graphics";
import { Grid } from "@dub/ui";
import { cn } from "@dub/utils";
import { Link as NavigationMenuLink } from "@radix-ui/react-navigation-menu";
import {
  ArrowLeftRight,
  Link2,
  QrCode,
  Receipt,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { CSSProperties, type ComponentType } from "react";

const products = [
  {
    title: "Crypto payments",
    description: "Accept USDC, XLM, and any Stellar asset",
    href: "/features/payments",
    color: "#8B5CF6",
    icon: ArrowLeftRight,
    iconClass: "bg-gradient-to-b from-violet-500 to-violet-600",
    graphic: PaymentsGraphic,
  },
  {
    title: "Checkout & payment links",
    description: "Hosted checkout pages and shareable links",
    href: "/features/checkout",
    color: "#10B981",
    icon: Link2,
    iconClass: "bg-gradient-to-b from-emerald-500 to-emerald-600",
    graphic: PaymentLinksGraphic,
  },
  {
    title: "Invoicing",
    description: "Bill customers with hosted invoices",
    href: "/features/invoicing",
    color: "#F4950C",
    icon: Receipt,
    iconClass: "bg-gradient-to-b from-orange-500 to-orange-600",
    graphic: InvoiceGraphic,
  },
  {
    title: "QR code checkout",
    description: "Free QR codes for every payment link",
    href: "/features/qr-checkout",
    color: "#3B82F6",
    icon: QrCode,
    iconClass: "bg-gradient-to-b from-blue-500 to-blue-600",
    graphic: QRGraphic,
  },
  {
    title: "Webhooks",
    description: "HMAC-signed events with automatic retries",
    href: "/features/webhooks",
    color: "#F43F5E",
    icon: Webhook,
    iconClass: "bg-gradient-to-b from-rose-500 to-rose-600",
    graphic: WebhooksGraphic,
  },
];

export function PayoesProductContent({ domain: _domain }: { domain: string }) {
  return (
    <div className="grid w-[960px] max-w-[calc(100vw-2rem)] grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map(
        ({
          title,
          description,
          href,
          color,
          icon: Icon,
          iconClass,
          graphic: Graphic,
        }) => (
          <ProductCard
            key={title}
            title={title}
            description={description}
            href={href}
            color={color}
            icon={Icon}
            iconClass={iconClass}
            graphic={Graphic}
          />
        ),
      )}
    </div>
  );
}

function ProductCard({
  title,
  description,
  href,
  color,
  icon: Icon,
  iconClass,
  graphic: Graphic,
}: {
  title: string;
  description: string;
  href: string;
  color: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClass: string;
  graphic: ComponentType;
}) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={href}
        className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50"
      >
        <Grid
          className="[mask-image:linear-gradient(transparent,black,transparent)] text-neutral-300"
          cellSize={60}
          patternOffset={[-51, -23]}
        />
        <div className="relative p-4 pb-0">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-lg text-white shadow-sm",
              iconClass,
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </div>
          <span className="mt-3 block text-sm font-medium text-neutral-900">
            {title}
          </span>
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        </div>
        <div className="relative mt-4 h-28 overflow-hidden [mask-image:linear-gradient(black_50%,transparent)]">
          <div className="absolute left-0 top-0 h-[302px] w-[520px] origin-top-left scale-[0.45]">
            <Graphic />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,var(--color),transparent)] opacity-[0.07] transition-opacity duration-150 group-hover:opacity-15"
          style={{ "--color": color } as CSSProperties}
        />
      </Link>
    </NavigationMenuLink>
  );
}
