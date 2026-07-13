import { Check } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { ButtonLink } from "../../button-link";
import { DarkCta } from "../../dark-cta";
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
          <div className="animate-slide-up-fade mx-auto flex h-7 w-fit items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-800 shadow-sm [--offset:5px] [animation-duration:1s] [animation-fill-mode:both]">
            <span
              className={cn(
                "size-2 rounded-full",
                feature.accentClassName,
              )}
            />
            {feature.badge}
          </div>
          <h1 className="font-display animate-slide-up-fade mt-6 text-balance text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.1] [--offset:20px] [animation-delay:100ms] [animation-duration:1s] [animation-fill-mode:both]">
            {feature.title}
          </h1>
          <p className="animate-slide-up-fade mt-5 max-w-2xl text-balance text-base text-neutral-600 sm:text-lg [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both]">
            {feature.tagline}
          </p>
          <div className="xs:flex-row animate-slide-up-fade mt-8 flex max-w-fit flex-col items-center gap-4 [--offset:5px] [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]">
            <ButtonLink variant="primary" href="/register">
              Start for free
            </ButtonLink>
            <ButtonLink variant="secondary" href="/developers">
              Explore the API
            </ButtonLink>
          </div>
        </div>

        <div className="animate-slide-up-fade relative mx-auto mt-14 w-full max-w-screen-md rounded-2xl border border-neutral-200 bg-white/70 px-4 pt-10 shadow-sm backdrop-blur-sm sm:px-10 [--offset:15px] [animation-delay:400ms] [animation-duration:1s] [animation-fill-mode:both]">
          <div className="relative h-64 overflow-hidden sm:h-[302px]">
            <Graphic />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20">
        <div className="mx-auto w-full max-w-screen-lg">
          <h2 className="font-display animate-slide-up-fade text-center text-3xl font-medium text-neutral-900 [--offset:10px] [animation-duration:700ms] [animation-fill-mode:both]">
            How it works
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {feature.steps.map(({ title, description }, idx) => (
              <div
                key={title}
                style={{ animationDelay: `${idx * 150 + 150}ms` }}
                className="animate-slide-up-fade flex flex-col items-center text-center [--offset:15px] [animation-duration:700ms] [animation-fill-mode:both]"
              >
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
          <h2 className="font-display animate-slide-up-fade text-center text-3xl font-medium text-neutral-900 [--offset:10px] [animation-duration:700ms] [animation-fill-mode:both]">
            What you get
          </h2>
          <ul className="mx-auto mt-12 grid max-w-screen-md gap-x-12 gap-y-6 sm:grid-cols-2">
            {feature.benefits.map(({ title, description }, index) => (
              <li
                key={title}
                style={{ animationDelay: `${index * 80 + 150}ms` }}
                className="group animate-slide-up-fade flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all duration-200 [--offset:15px] [animation-fill-mode:both] hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform duration-200 group-hover:scale-110">
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
            <h2 className="font-display animate-slide-up-fade text-center text-3xl font-medium text-neutral-900 [--offset:10px] [animation-duration:700ms] [animation-fill-mode:both]">
              {feature.code.title}
            </h2>
            <div className="animate-slide-up-fade mt-10 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-xl transition-shadow duration-300 [--offset:15px] [animation-duration:700ms] [animation-fill-mode:both] hover:shadow-2xl">
              <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-neutral-200">
                {feature.code.snippet}
              </pre>
            </div>
          </div>
        </section>
      )}

      <DarkCta
        id={`feature-cta-${feature.slug}`}
        badge={feature.badge}
        accentClassName={feature.accentClassName}
      />
    </>
  );
}
