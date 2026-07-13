import { ButtonLink } from "./button-link";
import { Grid } from "./grid";

const VALUE_PROPS = [
  {
    title: "Open source",
    description: "Audit, extend, or self-host the whole platform",
  },
  {
    title: "USDC, XLM & more",
    description: "Accept any Stellar asset out of the box",
  },
  {
    title: "Sandbox included",
    description: "Test everything free on Stellar Testnet",
  },
];

export function CTA() {
  return (
    <section id="cta" className="px-4">
      <div className="relative mx-auto mb-20 mt-12 w-full max-w-screen-lg overflow-hidden rounded-2xl bg-neutral-50 px-6 pb-16 pt-10 text-center sm:mt-0 sm:px-12">
        <Grid
          id="cta"
          cellSize={80}
          patternOffset={[1, -20]}
          className="inset-[unset] left-1/2 top-0 w-[1200px] -translate-x-1/2 text-neutral-200 [mask-image:linear-gradient(black_50%,transparent)]"
        />
        <div className="absolute -left-1/4 -top-1/2 h-[135%] w-[150%] opacity-5 blur-[130px] [transform:translate3d(0,0,0)]">
          <div className="size-full bg-[conic-gradient(from_-66deg,#855AFC_-32deg,#f00_63deg,#EAB308_158deg,#5CFF80_240deg,#855AFC_328deg,#f00_423deg)] [mask-image:radial-gradient(closest-side,black_100%,transparent_100%)]" />
        </div>

        <div className="relative mx-auto my-8 flex flex-wrap justify-center gap-x-12 gap-y-6">
          {VALUE_PROPS.map(({ title, description }) => (
            <div key={title} className="group flex max-w-44 flex-col items-center">
              <span className="text-sm font-semibold text-neutral-700 transition-transform duration-150 group-hover:scale-105">
                {title}
              </span>
              <p className="mt-2 text-balance text-xs text-neutral-500">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="relative mx-auto mt-1.5 flex w-full max-w-xl flex-col items-center">
          <h2 className="font-display text-balance text-4xl font-medium text-neutral-900 sm:text-[2.5rem] sm:leading-[1.15]">
            Supercharge your payments
          </h2>
          <p className="mt-5 text-balance text-base text-neutral-500 sm:text-xl">
            Start accepting stablecoin payments in minutes, not months.
          </p>
        </div>

        <div className="relative mx-auto mt-10 flex max-w-fit flex-col items-center gap-4 xs:flex-row">
          <ButtonLink variant="primary" href="/register">
            Start for free
          </ButtonLink>
          <ButtonLink variant="secondary" href="/login">
            Get a demo
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
