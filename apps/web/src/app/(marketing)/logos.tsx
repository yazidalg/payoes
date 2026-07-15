import { cn } from "@/lib/utils";
import { CTA_CONTENT } from "@/ui/marketing/homepage-content";

type Logo = {
  name: string;
  src: string;
  className: string;
  hideLabel?: boolean;
};

// Grayscale keeps luminance contrast inside each logo; opacity mutes to a
// neutral-400-adjacent tone without flattening icons into solid gray blobs.
const ICON_MUTED_CLASSES = "grayscale opacity-70";

const LOGOS: Logo[] = [
  {
    name: "Stellar",
    src: "/marketing/logos/stellar.svg",
    className: "h-7",
    hideLabel: true,
  },
  {
    name: "Soroban",
    src: "/marketing/logos/soroban.svg",
    className: "h-6",
    hideLabel: true,
  },
  {
    name: "USDC",
    src: "/marketing/logos/usdc.svg",
    className: "h-10",
  },
  {
    name: "XLM",
    src: "/marketing/logos/xlm.svg",
    className: "h-10",
  },
  {
    name: "Freighter",
    src: "/marketing/logos/freighter.png",
    className: "h-10",
  },
  {
    name: "xBull",
    src: "/marketing/logos/xbull.png",
    className: "h-10",
  },
  {
    name: "Albedo",
    src: "/marketing/logos/albedo.png",
    className: "h-10",
  },
  {
    name: "LOBSTR",
    src: "/marketing/logos/lobstr.png",
    className: "h-10",
  },
  {
    name: "Persona",
    src: "/marketing/logos/persona.svg",
    className: "h-10",
  },
];

const MARQUEE_LOGOS = [...LOGOS, ...LOGOS];

function LogoItem({
  logo,
  isDuplicate,
}: {
  logo: Logo;
  isDuplicate: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-row items-center gap-2">
      <div className="flex h-10 items-center justify-center">
        <img
          src={logo.src}
          alt={isDuplicate ? "" : logo.name}
          width={80}
          height={40}
          draggable={false}
          className={cn("w-auto", ICON_MUTED_CLASSES, logo.className)}
        />
      </div>
      {!logo.hideLabel ? (
        <span className="font-display whitespace-nowrap text-2xl font-bold text-neutral-400">
          {logo.name}
        </span>
      ) : null}
    </div>
  );
}

export function Logos() {
  return (
    <section id="logos" className="pt-8 pb-16">
      <p className="mx-auto max-w-sm text-balance text-center text-sm text-neutral-500">
        {CTA_CONTENT.logosCopy}
      </p>
      <div className="relative mt-8 flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
        <div
          className={cn(
            "flex w-max min-w-max items-center gap-24",
            "motion-safe:animate-infinite-scroll [--scroll:-50%] motion-safe:[animation-duration:50s]",
          )}
        >
          {MARQUEE_LOGOS.map((logo, index) => (
            <div key={`${logo.name}-${index}`} aria-hidden={index >= LOGOS.length}>
              <LogoItem logo={logo} isDuplicate={index >= LOGOS.length} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
