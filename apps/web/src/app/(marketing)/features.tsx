import Link from "next/link";
import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  AnalyticsGraphic,
  CollaborationGraphic,
  PaymentFeaturesGraphic,
  PaymentLinksGraphic,
  QRGraphic,
} from "./feature-graphics";

export function Features() {
  return (
    <section id="features" className="mt-20">
      <div className="mx-auto w-full max-w-xl px-4 text-center">
        <div className="mx-auto flex h-7 w-fit items-center rounded-full border border-neutral-200 bg-white px-4 text-xs text-neutral-800">
          What is Payoes?
        </div>
        <h2 className="font-display mt-2 text-balance text-3xl font-medium text-neutral-900">
          Powerful features for modern payment teams
        </h2>
        <p className="mt-3 text-pretty text-lg text-neutral-500">
          Payoes is more than a checkout page. We&apos;ve built a suite of
          powerful features that give your payments superpowers.
        </p>
      </div>

      <div className="mx-auto mt-14 grid w-full max-w-screen-lg grid-cols-1 px-4 sm:grid-cols-2">
        <div className="contents divide-neutral-200 max-sm:divide-y sm:divide-x">
          <FeatureCard
            title="Branded payment links"
            description="Create branded checkout links on your own domain and get paid in stablecoins. Every plan includes a complimentary custom domain."
            linkText="Learn more"
            href="#developers"
          >
            <PaymentLinksGraphic />
          </FeatureCard>
          <FeatureCard
            title="QR code checkout"
            description="QR codes and payment links are like peas in a pod. Payoes offers free QR codes for every link. Feeling artsy? Customize them with your own logo."
            linkText="Try the demo"
            href="#developers"
          >
            <QRGraphic />
          </FeatureCard>
        </div>

        <FeatureCard
          className="border-y border-neutral-200 pt-12 sm:col-span-2"
          graphicClassName="sm:h-96"
          title="Analytics that matter"
          description="Payoes provides powerful analytics for your payments, including volume, conversion, customer, and settlement insights in real time."
          linkText="Explore analytics"
          href="#developers"
        >
          <AnalyticsGraphic />
        </FeatureCard>

        <div className="contents divide-neutral-200 max-sm:divide-y sm:divide-x [&>*]:border-t [&>*]:border-neutral-200">
          <FeatureCard
            title="Advanced payment features"
            description="Supercharge your checkout with custom branding, metadata, expiration, geo targeting, and password protection, all configurable per link."
            linkText="Learn more"
            href="#developers"
          >
            <PaymentFeaturesGraphic />
          </FeatureCard>
          <FeatureCard
            title="Collaborate with your team"
            description="Invite your teammates to collaborate on payments. For enterprises, Payoes offers SAML SSO with Okta, Google, and Azure AD for higher security."
            linkText="Learn more"
            href="#developers"
          >
            <CollaborationGraphic />
          </FeatureCard>
        </div>
      </div>
    </section>
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
}: PropsWithChildren<{
  title: string;
  description: ReactNode;
  linkText: string;
  href: string;
  className?: string;
  graphicClassName?: string;
}>) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-10 px-4 py-14 sm:px-12",
        className,
      )}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/3 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[50px]",
          "bg-[conic-gradient(from_270deg,#F4950C,#EB5C0C,transparent,transparent)]",
        )}
      />
      <div
        className={cn(
          "relative h-64 overflow-hidden sm:h-[302px]",
          graphicClassName,
        )}
      >
        {children}
      </div>
      <div className="relative flex flex-col">
        <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
        <p className="mt-2 text-neutral-500">{description}</p>
        <Link
          href={href}
          className={cn(
            "mt-6 w-fit whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium leading-none text-neutral-900 transition-colors duration-75",
            "outline-none hover:bg-neutral-50 focus-visible:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900 active:bg-neutral-100",
          )}
        >
          {linkText}
        </Link>
      </div>
    </div>
  );
}
