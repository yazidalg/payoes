import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "./button-link";
import { Grid } from "./grid";

const RATINGS = [
  { name: "G2", stars: 5 },
  { name: "Product Hunt", stars: 5 },
  { name: "Trustpilot", stars: 4.5 },
];

const WORDMARKS = [
  "Meridian",
  "Northwind",
  "Lumen",
  "Cobalt",
  "Vantage",
  "Helio",
  "Cascade",
  "Orbit",
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

        <div className="relative mx-auto my-8 flex w-fit gap-8">
          {RATINGS.map(({ name, stars }) => (
            <div key={name} className="group flex flex-col items-center">
              <span className="text-sm font-semibold text-neutral-700 transition-transform duration-150 group-hover:scale-105">
                {name}
              </span>
              <div className="mt-4 flex items-center gap-1.5 text-black">
                {[...Array(Math.floor(stars))].map((_, idx) => (
                  <Star
                    key={idx}
                    fill="currentColor"
                    strokeWidth={0}
                    className="size-4 text-amber-500"
                  />
                ))}
                {stars % 1 > 0 && (
                  <StarHalf
                    fill="currentColor"
                    strokeWidth={0}
                    className="size-4 text-amber-500"
                  />
                )}
              </div>
              <p className="mt-2 text-xs text-neutral-500">{stars} out of 5</p>
            </div>
          ))}
        </div>

        <div className="relative mx-auto mt-1.5 flex w-full max-w-xl flex-col items-center">
          <h2 className="font-display text-balance text-4xl font-medium text-neutral-900 sm:text-[2.5rem] sm:leading-[1.15]">
            Supercharge your payments
          </h2>
          <p className="mt-5 text-balance text-base text-neutral-500 sm:text-xl">
            See why Payoes is the payment platform of choice for modern teams.
          </p>
        </div>

        <div className="relative mx-auto mt-10 flex max-w-fit gap-4">
          <ButtonLink variant="primary" href="/register">
            Start for free
          </ButtonLink>
          <ButtonLink variant="secondary" href="/login">
            Get a demo
          </ButtonLink>
        </div>

        <div className="relative mt-12">
          <p className="mx-auto max-w-sm text-balance text-center text-sm text-neutral-500">
            Giving payment superpowers to world-class teams
          </p>
          <div className="mt-8 flex w-full items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
            {[...Array(2)].map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex w-max min-w-max items-center gap-12 pl-12",
                  "motion-safe:animate-infinite-scroll [--scroll:-100%] motion-safe:[animation-duration:40s]",
                )}
                aria-hidden={idx !== 0}
              >
                {WORDMARKS.map((name) => (
                  <span
                    key={name}
                    className="font-display whitespace-nowrap text-xl font-bold text-neutral-400"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
