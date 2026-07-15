import { cn } from "@/lib/utils";
import { HERO_CONTENT } from "@/ui/marketing/homepage-content";
import { ButtonLink, buttonVariants } from "./button-link";
import { HeroRotatingWord } from "./hero-rotating-word";
import { HeroShowcase } from "./hero-showcase";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto max-w-grid-width px-4 sm:px-12">
        <div className="flex flex-col items-center pt-16 text-center sm:pt-20 lg:pt-24">
          <h1 className="font-display text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.15] text-pretty animate-slide-up-fade [--offset:20px] [animation-delay:100ms] [animation-duration:1s] [animation-fill-mode:both] motion-reduce:animate-fade-in">
            {HERO_CONTENT.titlePrefix}
            <HeroRotatingWord words={HERO_CONTENT.rotatingWords} />
            {HERO_CONTENT.titleSuffix}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base text-neutral-600 sm:text-xl animate-slide-up-fade [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both] motion-reduce:animate-fade-in">
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
            <a
              href={HERO_CONTENT.githubCta.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex h-10 w-fit items-center gap-2 whitespace-nowrap rounded-lg border px-5 text-base font-medium",
                buttonVariants({ variant: "outline" }),
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-4"
                aria-hidden
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              {HERO_CONTENT.githubCta.label}
            </a>
          </div>

          <div className="animate-slide-up-fade -mb-20 mt-14 w-full sm:-mb-24 sm:mt-16 lg:-mb-28 lg:mt-20 [--offset:10px] [animation-delay:400ms] [animation-duration:1s] [animation-fill-mode:both] motion-reduce:animate-fade-in">
            <HeroShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}
