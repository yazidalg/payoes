"use client";

import { ExpandingArrow } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { PropsWithChildren } from "react";
import Markdown from "react-markdown";
import { Analytics } from "./feature-graphics/analytics";
import { Collaboration } from "./feature-graphics/collaboration";
import { getDocsUrl } from "@/lib/docs/url";
import { FEATURES_SECTION_CONTENT } from "@/ui/marketing/homepage-content";
import { Webhooks } from "./feature-graphics/webhooks";
import { PaymentGateway } from "./feature-graphics/payment-gateway";
import { QR } from "./feature-graphics/qr";

function isDocsLink(href: string) {
  return href.startsWith(getDocsUrl());
}

export function FeaturesSection() {
  const webhooksDocsUrl = `${getDocsUrl()}/guides/webhooks`;
  const checkoutDocsUrl = `${getDocsUrl()}/guides/checkout`;
  const conceptsDocsUrl = `${getDocsUrl()}/guides/concepts`;
  const analyticsDocsUrl = `${getDocsUrl()}/guides/analytics`;
  const teamDocsUrl = `${getDocsUrl()}/guides/concepts#team-members`;
  return (
    <div className="mt-20">
      <div className="mx-auto w-full max-w-xl px-4 text-center">
        <div className="mx-auto flex h-7 w-fit items-center rounded-full border border-neutral-200 bg-white px-4 text-xs text-neutral-800">{FEATURES_SECTION_CONTENT.badge}</div>
        <h2 className="font-display mt-2 text-balance text-3xl font-medium text-neutral-900">{FEATURES_SECTION_CONTENT.title}</h2>
        <p className="mt-3 text-pretty text-lg text-neutral-500">{FEATURES_SECTION_CONTENT.description}</p>
      </div>
      <div className="mx-auto mt-14 grid w-full max-w-screen-lg grid-cols-1 px-4 sm:grid-cols-2">
        <div className="contents divide-neutral-200 max-sm:divide-y sm:divide-x">
          <FeatureCard title="Stay in sync with webhooks" description={`Receive signed HTTP callbacks when payments complete, fail, or expire. Subscribe to events like [payment.completed](${webhooksDocsUrl}) and verify payloads in your backend.`} linkText="View documentation" href={webhooksDocsUrl} hoverOverlay={false}>
            <Webhooks />
          </FeatureCard>
          <FeatureCard title="Crypto QR payments" description={`Generate scannable QR codes for hosted checkout. Customers scan, connect their wallet, and pay with [XLM and Stellar assets](${checkoutDocsUrl}) in seconds.`} linkText="Learn more" href={checkoutDocsUrl}>
            <QR />
          </FeatureCard>
        </div>

        <FeatureCard className="border-y border-neutral-200 pt-12 sm:col-span-2" graphicClassName="sm:h-96" title="Analytics that matter" description="Track payment volume, success rate, and payment counts over time. Break down performance by asset, payment method, status, and top customers from your dashboard." linkText="Explore analytics" href={analyticsDocsUrl}>
          <Analytics />
        </FeatureCard>

        <div className="contents divide-neutral-200 max-sm:divide-y sm:divide-x [&>*]:border-t [&>*]:border-neutral-200">
          <FeatureCard title="Full payment gateway on Stellar" graphicClassName="h-72 sm:h-[350px]" description={`Share reusable [payment links](${conceptsDocsUrl}), send [invoices](${conceptsDocsUrl}), and accept crypto with hosted [checkout](${checkoutDocsUrl}). Customers pay with XLM and Stellar assets on a branded page.`} linkText="Learn more" href={checkoutDocsUrl}>
            <PaymentGateway />
          </FeatureCard>
          <FeatureCard title="Build teams across your businesses" description={`Create an [organization](${teamDocsUrl}) for each business, invite teammates by email, and manage [roles and access](${teamDocsUrl}) across multiple businesses from one account.`} linkText="Learn more" href={teamDocsUrl}>
            <Collaboration />
          </FeatureCard>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  linkText,
  href,
  children,
  className,
  graphicClassName,
  hoverOverlay = true,
}: PropsWithChildren<{
  title: string;
  description: string;
  linkText: string;
  href: string;
  className?: string;
  graphicClassName?: string;
  hoverOverlay?: boolean;
}>) {
  return (
    <div className={cn("relative flex flex-col gap-10 px-4 py-14 sm:px-12", className)}>
      <div className={cn("absolute left-1/2 top-1/3 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[50px]", "bg-[conic-gradient(from_270deg,#F4950C,#EB5C0C,transparent,transparent)]")} />
      <div className={cn("relative h-64 overflow-hidden sm:h-[302px]", graphicClassName)}>
        {hoverOverlay ? (
          <FeatureGraphicHoverLink href={href} linkText={linkText}>
            {children}
          </FeatureGraphicHoverLink>
        ) : (
          children
        )}
      </div>
      <div className="relative flex flex-col">
        <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
        <div className={cn("mt-2 text-neutral-500 transition-colors", "[&_a]:font-medium [&_a]:text-neutral-600 [&_a]:underline [&_a]:decoration-dotted [&_a]:underline-offset-2 hover:[&_a]:text-neutral-800")}>
          <Markdown
            components={{
              a: ({ children, href }) => {
                if (!href) return null;
                const external = isDocsLink(href);
                return (
                  <Link href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : { target: "_blank" })}>
                    {children}
                  </Link>
                );
              },
            }}>
            {description}
          </Markdown>
        </div>
        <Link href={href} {...(isDocsLink(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={cn("mt-6 w-fit whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium leading-none text-neutral-900 transition-colors duration-75", "outline-none hover:bg-neutral-50 focus-visible:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900 active:bg-neutral-100")}>
          {linkText}
        </Link>
      </div>
    </div>
  );
}

function FeatureGraphicHoverLink({
  href,
  linkText,
  children,
}: PropsWithChildren<{
  href: string;
  linkText: string;
}>) {
  return (
    <Link href={href} {...(isDocsLink(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="group relative block size-full cursor-pointer">
      <div className="size-full transition-[filter,opacity] duration-300 group-hover:opacity-70 group-hover:blur-[3px]">{children}</div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60 px-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="flex items-center gap-1 text-sm font-medium text-neutral-900">
          {linkText}
          <ExpandingArrow className="size-4" />
        </span>
      </div>
    </Link>
  );
}
