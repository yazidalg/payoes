import Image from "next/image";

export function HeroShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-t-xl bg-white">
        <div className="relative aspect-[3539/2082] w-full">
          <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_38%,rgba(0,0,0,0.45)_62%,transparent_90%)]">
            <Image
              src="/marketing/hero.png"
              alt="Payoes dashboard"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 64rem"
              className="object-cover object-top"
            />
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[58%] bg-gradient-to-b from-transparent from-0% via-white/60 via-35% to-white to-72%"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
