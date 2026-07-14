import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { DarkCta } from "../../dark-cta";
import { Grid } from "../../grid";
import { StepFlow } from "../../step-flow";
import { DOC_SECTION_ORDER, DOC_SECTIONS } from "../docs-content";

export function generateStaticParams() {
  return DOC_SECTION_ORDER.map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const doc = DOC_SECTIONS[section];
  if (!doc) return {};

  return {
    title: `${doc.title} - Payoes Docs`,
    description: doc.description,
  };
}

export default async function DocsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const doc = DOC_SECTIONS[section];
  if (!doc) notFound();

  const order = DOC_SECTION_ORDER.indexOf(doc.slug);
  const prev = order > 0 ? DOC_SECTIONS[DOC_SECTION_ORDER[order - 1]] : null;
  const next =
    order < DOC_SECTION_ORDER.length - 1
      ? DOC_SECTIONS[DOC_SECTION_ORDER[order + 1]]
      : null;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-14 pt-24 text-center">
        <div className={cn("absolute inset-0", doc.washClassName)} />
        <Grid
          id={`docs-${doc.slug}`}
          cellSize={80}
          patternOffset={[1, -58]}
          className="text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
        />

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
          <Link
            href="/docs"
            className="animate-slide-up-fade flex h-7 w-fit items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 [--offset:5px] [animation-duration:1s] [animation-fill-mode:both]"
          >
            <span className={cn("size-2 rounded-full", doc.accentClassName)} />
            Docs
            <span className="text-neutral-400">/</span>
            {doc.title}
          </Link>
          <h1 className="font-display animate-slide-up-fade mt-6 text-balance text-4xl font-medium text-neutral-900 [--offset:20px] [animation-delay:100ms] [animation-duration:1s] [animation-fill-mode:both] sm:text-5xl sm:leading-[1.1]">
            {doc.title}
          </h1>
          <p className="animate-slide-up-fade mt-5 max-w-2xl text-balance text-base text-neutral-600 [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both] sm:text-lg">
            {doc.description}
          </p>

          {/* Article quick-nav */}
          <div className="animate-slide-up-fade mt-8 flex flex-wrap items-center justify-center gap-2 [--offset:5px] [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]">
            {doc.articles.map(({ id, title }) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow"
              >
                {title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Articles: alternating bands, each with its own entrance animation */}
      {doc.articles.map(({ id, title, intro, bullets, flow }, idx) => (
        <section
          key={id}
          id={id}
          className={cn(
            "scroll-mt-24 px-4 py-16",
            idx % 2 === 1 && "border-y border-neutral-200 bg-neutral-50/60",
          )}
        >
          <div
            className="animate-slide-up-fade mx-auto w-full max-w-screen-md [--offset:15px] [animation-duration:700ms] [animation-fill-mode:both]"
            style={{ animationDelay: `${Math.min(idx, 2) * 150 + 350}ms` }}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-sm font-semibold text-white",
                  doc.accentClassName,
                )}
              >
                {idx + 1}
              </div>
              <h2 className="font-display text-2xl font-medium text-neutral-900 sm:text-3xl">
                {title}
              </h2>
            </div>
            <p className="mt-4 text-pretty text-neutral-600">{intro}</p>

            {flow && (
              <div className="mt-8">
                <StepFlow title={flow.title} steps={flow.steps} />
              </div>
            )}

            {bullets && (
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {bullets.map(({ label, text }) => (
                  <li
                    key={label}
                    className="group flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125",
                        doc.accentClassName,
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm text-neutral-500">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}

      {/* Prev / next section navigation */}
      <section className="px-4 py-12">
        <div className="mx-auto grid w-full max-w-screen-md gap-4 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/docs/${prev.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <ArrowLeft className="size-4 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:-translate-x-1" />
              <div>
                <p className="text-xs text-neutral-500">Previous</p>
                <p className="text-sm font-medium text-neutral-900">
                  {prev.title}
                </p>
              </div>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/docs/${next.slug}`}
              className="group flex items-center justify-end gap-3 rounded-xl border border-neutral-200 bg-white p-5 text-right transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:col-start-2"
            >
              <div>
                <p className="text-xs text-neutral-500">Next</p>
                <p className="text-sm font-medium text-neutral-900">
                  {next.title}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </section>

      <DarkCta
        id={`docs-${doc.slug}-cta`}
        badge={doc.title}
        accentClassName={doc.accentClassName}
        title="Ready to build?"
        description="Grab a sandbox key and make your first request in minutes."
      />
    </>
  );
}
