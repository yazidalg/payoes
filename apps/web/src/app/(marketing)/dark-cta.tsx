import Link from "next/link";
import { cn } from "@/lib/utils";
import { ButtonLink } from "./button-link";
import { Grid } from "./grid";

/* Dark closing panel with a white notch hanging from the section above,
   echoing the hero showcase shelf. Shared by the feature, developers, and
   docs pages; the accent gradient carries each page's identity color. */
export function DarkCta({
  id,
  badge,
  accentClassName,
  title = "Start accepting payments today",
  description = "Free sandbox on Stellar Testnet. No credit card required.",
}: {
  id: string;
  badge: string;
  accentClassName: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className="relative mt-24 overflow-hidden bg-neutral-950 px-6 pb-24 pt-24 text-center">
      <div
        className={cn(
          "absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full opacity-25 blur-[120px]",
          accentClassName,
        )}
      />
      <Grid
        id={id}
        cellSize={80}
        patternOffset={[1, -20]}
        className="text-neutral-800 [mask-image:linear-gradient(black,transparent_70%)]"
      />

      <div className="absolute left-1/2 top-0 h-14 w-[23rem] max-w-[80vw] -translate-x-1/2 rounded-b-[1.75rem] bg-white sm:w-[38rem]">
        <span
          aria-hidden
          className="absolute left-0 top-0 size-8 -translate-x-full"
          style={{
            background:
              "radial-gradient(circle at bottom left, transparent 32px, #ffffff 32px)",
          }}
        />
        <span
          aria-hidden
          className="absolute right-0 top-0 size-8 translate-x-full"
          style={{
            background:
              "radial-gradient(circle at bottom right, transparent 32px, #ffffff 32px)",
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center">
        <div className="flex h-7 w-fit items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-4 text-xs font-medium text-neutral-200">
          <span className={cn("size-2 rounded-full", accentClassName)} />
          {badge}
        </div>
        <h2 className="font-display mt-6 text-balance text-3xl font-medium text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-balance text-neutral-400">{description}</p>
        <div className="xs:flex-row mt-8 flex max-w-fit flex-col items-center gap-4">
          <ButtonLink
            variant="secondary"
            href="/register"
            className="border-white hover:ring-4 hover:ring-white/20"
          >
            Start for free
          </ButtonLink>
        </div>
        <Link
          href="/"
          className="mt-10 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
        >
          &larr; Back to home
        </Link>
      </div>
    </section>
  );
}
