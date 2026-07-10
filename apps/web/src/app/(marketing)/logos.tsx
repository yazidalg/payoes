import { cn } from "@/lib/utils";

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

export function Logos() {
  return (
    <section id="logos" className="py-16">
      <p className="mx-auto max-w-sm text-balance text-center text-sm text-neutral-500">
        Powering payments for teams building on Stellar
      </p>
      <div className="relative mt-8 flex w-full items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
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
                className="font-display whitespace-nowrap text-2xl font-bold text-neutral-400"
              >
                {name}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
