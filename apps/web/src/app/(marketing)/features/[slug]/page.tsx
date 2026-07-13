import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { ButtonLink } from "../../button-link";
import { Grid } from "../../grid";
import { FEATURES } from "../feature-content";

export function generateStaticParams() {
  return Object.keys(FEATURES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = FEATURES[slug];
  if (!feature) return {};

  return {
    title: `${feature.title} - Payoes`,
    description: feature.tagline,
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = FEATURES[slug];
  if (!feature) notFound();

  const Graphic = feature.graphic;

  return (
    <>
      {/* Hero: full-width wash rising from the bottom, grid lines over it,
          and the feature graphic inside so the wash flows behind it. */}
      <section className="relative overflow-hidden px-6 pb-16 pt-24 text-center">
        <div className={cn("absolute inset-0", feature.washClassName)} />
        <Grid
          id={`feature-${feature.slug}`}
          cellSize={80}
          patternOffset={[1, -58]}
          className="text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
        />

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
          <div className="mx-auto flex h-7 w-fit items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-800 shadow-sm">
            <span
              className={cn(
                "size-2 rounded-full",
                feature.accentClassName,
              )}
            />
            {feature.badge}
          </div>
          <h1 className="font-display mt-6 text-balance text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.1]">
            {feature.title}
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-base text-neutral-600 sm:text-lg">
            {feature.tagline}
          </p>
          <div className="xs:flex-row mt-8 flex max-w-fit flex-col items-center gap-4">
            <ButtonLink variant="primary" href="/register">
              Start for free
            </ButtonLink>
            <ButtonLink variant="secondary" href="/developers">
              Explore the API
            </ButtonLink>
          </div>
        </div>

        <div className="relative mx-auto mt-14 w-full max-w-screen-md rounded-2xl border border-neutral-200 bg-white/70 px-4 pt-10 shadow-sm backdrop-blur-sm sm:px-10">
          <div className="relative h-64 overflow-hidden sm:h-[302px]">
            <Graphic />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20">
        <div className="mx-auto w-full max-w-screen-lg">
          <h2 className="font-display text-center text-3xl font-medium text-neutral-900">
            How it works
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {feature.steps.map(({ title, description }, idx) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-sm font-semibold text-white",
                    feature.accentClassName,
                  )}
                >
                  {idx + 1}
                </div>
                <h3 className="mt-4 text-base font-medium text-neutral-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-y border-neutral-200 bg-neutral-50/60 px-4 py-20">
        <div className="mx-auto w-full max-w-screen-lg">
          <h2 className="font-display text-center text-3xl font-medium text-neutral-900">
            What you get
          </h2>
          <ul className="mx-auto mt-12 grid max-w-screen-md gap-x-12 gap-y-6 sm:grid-cols-2">
            {feature.benefits.map(({ title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
                  <Check className="size-3" strokeWidth={3} />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {title}
                  </p>
                  <p className="text-sm text-neutral-500">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Code example */}
      {feature.code && (
        <section className="px-4 py-20">
          <div className="mx-auto w-full max-w-screen-md">
            <h2 className="font-display text-center text-3xl font-medium text-neutral-900">
              {feature.code.title}
            </h2>
            <div className="mt-10 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-xl">
              <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-neutral-200">
                {feature.code.snippet}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-4 pb-24 pt-4 text-center">
        <h2 className="font-display text-balance text-3xl font-medium text-neutral-900">
          Start accepting payments today
        </h2>
        <p className="mt-4 text-neutral-500">
          Free sandbox on Stellar Testnet. No credit card required.
        </p>
        <div className="xs:flex-row mx-auto mt-8 flex max-w-fit flex-col items-center gap-4">
          <ButtonLink variant="primary" href="/register">
            Start for free
          </ButtonLink>
          <ButtonLink variant="secondary" href="/#features">
            See all features
          </ButtonLink>
        </div>
        <div className="mt-10">
          <Link
            href="/"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            &larr; Back to home
          </Link>
        </div>
      </section>
    </>
  );
}
