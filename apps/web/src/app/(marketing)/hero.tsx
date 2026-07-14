import { ButtonLink } from "./button-link";
import { Grid } from "./grid";
import { HeroShowcase } from "./hero-showcase";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 text-center sm:py-32">
      {/* Full-bleed background: subtle grid on a plain white surface. */}
      <Grid
        id="hero"
        cellSize={80}
        patternOffset={[1, -58]}
        className="text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
          <a
            href="#features"
            className="animate-slide-up-fade mx-auto flex h-7 items-center rounded-full border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-800 shadow-sm [--offset:5px] [animation-duration:1s] [animation-fill-mode:both]"
          >
            Introducing Payoes Subscriptions &rarr;
          </a>

          <h1 className="font-display animate-slide-up-fade mt-6 text-balance text-center text-4xl font-medium text-neutral-900 [--offset:20px] [animation-delay:100ms] [animation-duration:1s] [animation-fill-mode:both] sm:text-6xl sm:leading-[1.1]">
            Turn checkout into revenue
          </h1>
          <p className="animate-slide-up-fade mt-5 max-w-xl text-balance text-base text-neutral-600 [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both] sm:text-xl">
            Payoes is the modern payment platform for stablecoin checkout,
            payment links, and subscriptions on Stellar.
          </p>

          <div className="animate-slide-up-fade xs:flex-row mt-8 flex max-w-fit flex-col items-center gap-4 [--offset:5px] [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]">
            <ButtonLink variant="primary" href="/register">
              Start for free
            </ButtonLink>
          </div>

      </div>

      <div className="animate-slide-up-fade relative [--offset:10px] [animation-delay:400ms] [animation-duration:1s] [animation-fill-mode:both]">
        <HeroShowcase />
      </div>
    </section>
  );
}
