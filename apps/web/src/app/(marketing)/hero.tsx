import { CreditCard, Link2, RefreshCw } from "lucide-react";
import { ButtonLink } from "./button-link";
import { Grid } from "./grid";

// Signature hero aurora gradient, ported verbatim from the reference design.
const HERO_GRADIENT = `radial-gradient(77% 116% at 37% 67%, #EEA5BA, rgba(238, 165, 186, 0) 50%),
  radial-gradient(56% 84% at 34% 56%, #3A8BFD, rgba(58, 139, 253, 0) 50%),
  radial-gradient(85% 127% at 100% 100%, #E4C795, rgba(228, 199, 149, 0) 50%),
  radial-gradient(82% 122% at 3% 29%, #855AFC, rgba(133, 90, 252, 0) 50%),
  radial-gradient(90% 136% at 52% 100%, #FD3A4E, rgba(253, 58, 78, 0) 50%),
  radial-gradient(102% 143% at 92% 7%, #72FE7D, rgba(114, 254, 125, 0) 50%)`;

const HERO_CARDS = [
  {
    icon: Link2,
    title: "Payment Links",
    description: "Share a link, get paid in stablecoins.",
  },
  {
    icon: CreditCard,
    title: "Hosted Checkout",
    description: "A polished checkout page, zero code.",
  },
  {
    icon: RefreshCw,
    title: "Subscriptions",
    description: "Recurring billing on autopilot.",
  },
];

export function Hero() {
  return (
    <section className="relative px-4 pt-6">
      <div className="relative mx-auto w-full max-w-screen-lg overflow-hidden rounded-2xl bg-neutral-50 px-6 py-20 text-center sm:px-0 sm:py-28">
        <Grid
          id="hero"
          cellSize={80}
          patternOffset={[1, -58]}
          className="inset-[unset] left-1/2 top-0 w-[1200px] -translate-x-1/2 text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
        />
        <div className="absolute -inset-x-10 bottom-0 h-[60%] opacity-40 blur-[100px] [transform:translate3d(0,0,0)]">
          <div
            className="size-full -scale-y-100 [mask-image:radial-gradient(closest-side,black_100%,transparent_100%)]"
            style={{ backgroundImage: HERO_GRADIENT }}
          />
        </div>

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
            <ButtonLink variant="secondary" href="#cta">
              Get a demo
            </ButtonLink>
          </div>

          <div className="animate-slide-up-fade mt-16 grid w-full grid-cols-1 gap-4 [--offset:10px] [animation-delay:400ms] [animation-duration:1s] [animation-fill-mode:both] sm:grid-cols-3">
            {HERO_CARDS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col items-start gap-3 rounded-xl border border-neutral-200 bg-white/80 p-5 text-left shadow-sm backdrop-blur-sm"
              >
                <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white text-neutral-900">
                  <Icon className="size-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
