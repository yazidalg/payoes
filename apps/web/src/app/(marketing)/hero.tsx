import { HERO_CONTENT } from "@/ui/marketing/homepage-content";
import { ButtonLink } from "./button-link";
import { Grid } from "./grid";
import { HeroShowcase } from "./hero-showcase";

export function Hero() {
  return (
    <section className="grid-section relative overflow-clip border-b-0 border-grid-border bg-white px-4">
      <div className="relative z-0 mx-auto max-w-grid-width border-grid-border px-4 pb-0 pt-24 text-center sm:px-12 sm:pt-32">
        {/* Border-x mask overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 border-x border-grid-border [mask-image:linear-gradient(transparent_15%,black_45%)]"
        />

        {/* Side grid SVGs (left and right) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 w-[1800px] -translate-x-1/2 opacity-100 [mask-composite:intersect] [mask-image:linear-gradient(transparent_20%,black_55%)]"
        >
          <div className="absolute inset-x-[360px] inset-y-0">
            <Grid
              id="hero-left"
              cellSize={60}
              strokeWidth={2}
              className="inset-[unset] bottom-0 right-full h-[600px] w-[360px] text-grid-border [mask-image:linear-gradient(90deg,transparent_5%,black_40%)]"
            />
            <Grid
              id="hero-right"
              cellSize={60}
              strokeWidth={2}
              className="inset-[unset] bottom-0 left-full h-[600px] w-[360px] text-grid-border [mask-image:linear-gradient(270deg,transparent_5%,black_40%)]"
            />
          </div>
        </div>

        {/* Center bottom grid SVG */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-px inset-y-0 overflow-hidden [mask-image:linear-gradient(transparent_15%,black_50%),radial-gradient(ellipse_at_center_bottom,black,transparent_85%)]"
        >
          <Grid
            id="hero-center"
            cellSize={60}
            strokeWidth={2}
            className="inset-[unset] bottom-0 left-1/2 h-[600px] w-grid-width -translate-x-1/2 text-grid-border"
          />
        </div>

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
          <h1 className="mt-5 text-center font-display text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.15] animate-slide-up-fade [--offset:20px] [animation-duration:1s] [animation-fill-mode:both] motion-reduce:animate-fade-in text-pretty [animation-delay:100ms]">
            {HERO_CONTENT.title}
          </h1>
          <p className="mt-5 text-pretty text-base text-neutral-600 sm:text-xl animate-slide-up-fade [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both] motion-reduce:animate-fade-in">
            {HERO_CONTENT.description}
          </p>

          <div className="animate-slide-up-fade xs:flex-row mt-8 flex max-w-fit flex-col items-center gap-4 [--offset:5px] [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]">
            <ButtonLink
              variant="secondary"
              href={HERO_CONTENT.primaryCta.href}
              className="border-neutral-200 bg-white text-neutral-900 shadow-sm hover:bg-neutral-50"
            >
              {HERO_CONTENT.primaryCta.label}
            </ButtonLink>
          </div>
        </div>

        <div className="animate-slide-up-fade relative [--offset:10px] [animation-delay:400ms] [animation-duration:1s] [animation-fill-mode:both]">
          <HeroShowcase />
        </div>
      </div>
    </section>
  );
}
