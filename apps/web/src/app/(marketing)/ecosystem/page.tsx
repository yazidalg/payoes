import {
  Coins,
  Cpu,
  Globe,
  Landmark,
  Route,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { DarkCta } from "../dark-cta";
import { Grid } from "../grid";

export const metadata: Metadata = {
  title: "Ecosystem - Payoes",
  description:
    "Payoes is built on Stellar and plugs into its entire ecosystem: USDC and EURC stablecoins, every major wallet, Soroban smart contracts, and the largest on and off ramp network of any blockchain.",
};

const ACCENT = "bg-gradient-to-b from-violet-500 to-violet-600";

type Pillar = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClass: string;
  borderClass: string;
};

const PILLARS: Pillar[] = [
  {
    title: "The Stellar network",
    description:
      "A payments-first Layer-1 built for moving money, with settlement in about five seconds and fees measured in fractions of a cent.",
    icon: Globe,
    iconClass: "bg-gradient-to-b from-violet-500 to-violet-600",
    borderClass: "hover:border-violet-200",
  },
  {
    title: "Soroban smart contracts",
    description:
      "Rust smart contracts running on WebAssembly, live on mainnet. Payoes uses Soroban for on-chain settlement and escrow.",
    icon: Cpu,
    iconClass: "bg-gradient-to-b from-blue-500 to-blue-600",
    borderClass: "hover:border-blue-200",
  },
  {
    title: "Stablecoins and assets",
    description:
      "Accept USDC and EURC from Circle, native XLM, or any Stellar asset your business works with, all at the same 1% rate.",
    icon: Coins,
    iconClass: "bg-gradient-to-b from-emerald-500 to-emerald-600",
    borderClass: "hover:border-emerald-200",
  },
  {
    title: "Wallets your customers own",
    description:
      "Customers pay with the wallet they already use: Freighter, LOBSTR, xBull, Albedo, Rabet, and Hana. No account, no login.",
    icon: Wallet,
    iconClass: "bg-gradient-to-b from-orange-500 to-orange-600",
    borderClass: "hover:border-orange-200",
  },
  {
    title: "Anchors and global ramps",
    description:
      "The largest on and off ramp network of any blockchain: 80+ anchors, 170+ fiat currencies, and 475,000+ access points worldwide.",
    icon: Landmark,
    iconClass: "bg-gradient-to-b from-rose-500 to-rose-600",
    borderClass: "hover:border-rose-200",
  },
  {
    title: "Path payments and the DEX",
    description:
      "Protocol-level pathfinding lets a customer pay in one asset and settle in another through the built-in order books and liquidity pools.",
    icon: Route,
    iconClass: "bg-gradient-to-b from-indigo-500 to-indigo-600",
    borderClass: "hover:border-indigo-200",
  },
];

const STATS = [
  { value: "475K+", label: "Ramp access points" },
  { value: "170+", label: "Fiat currencies" },
  { value: "80+", label: "Regulated anchors" },
  { value: "225+", label: "Jurisdictions" },
  { value: "~5s", label: "Settlement time" },
  { value: "<$0.01", label: "Average network fee" },
];

const WALLETS = [
  { name: "Freighter", note: "The default browser wallet, built by the Stellar Development Foundation." },
  { name: "LOBSTR", note: "A mainstream mobile and web wallet for everyday users." },
  { name: "xBull", note: "Open-source wallet for power users, as a PWA or extension." },
  { name: "Albedo", note: "Lightweight web signing with no extension required." },
  { name: "Rabet", note: "A simple browser extension wallet for quick signing." },
  { name: "Hana", note: "A multi-chain wallet that brings new users to Stellar." },
];

const MARQUEE = [
  "Stellar",
  "Soroban",
  "USDC",
  "EURC",
  "XLM",
  "Freighter",
  "LOBSTR",
  "xBull",
  "Albedo",
  "Rabet",
  "Hana",
  "Circle",
];

export default function EcosystemPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center sm:py-28">
        <Grid
          id="ecosystem-hero"
          cellSize={80}
          patternOffset={[1, -58]}
          className="text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
        />
        <div
          className={cn(
            "absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 rounded-full opacity-15 blur-[120px]",
            ACCENT,
          )}
        />

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
          <div className="animate-slide-up-fade flex h-7 w-fit items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-800 shadow-sm [--offset:5px] [animation-duration:1s] [animation-fill-mode:both]">
            <span className={cn("size-2 rounded-full", ACCENT)} />
            Ecosystem
          </div>
          <h1 className="font-display animate-slide-up-fade mt-6 text-balance text-4xl font-medium text-neutral-900 [--offset:20px] [animation-delay:100ms] [animation-duration:1s] [animation-fill-mode:both] sm:text-5xl sm:leading-[1.1]">
            Built on Stellar, connected to it all
          </h1>
          <p className="animate-slide-up-fade mt-5 max-w-xl text-balance text-base text-neutral-600 [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both] sm:text-xl">
            Payoes plugs into the entire Stellar ecosystem, the stablecoins,
            wallets, smart contracts, and global ramps that move money for
            millions of people.
          </p>
        </div>
      </section>

      {/* Marquee of ecosystem names */}
      <section className="pb-4">
        <div className="relative flex w-full items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
          {[...Array(2)].map((_, idx) => (
            <div
              key={idx}
              className="motion-safe:animate-infinite-scroll flex w-max min-w-max items-center gap-12 pl-12 [--scroll:-100%] motion-safe:[animation-duration:40s]"
              aria-hidden={idx !== 0}
            >
              {MARQUEE.map((name) => (
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

      {/* Pillars */}
      <section className="mt-20">
        <div className="mx-auto w-full max-w-xl px-4 text-center">
          <h2 className="font-display text-balance text-3xl font-medium text-neutral-900 sm:text-4xl">
            Everything a payment touches
          </h2>
          <p className="mt-3 text-lg text-neutral-500">
            Payoes handles the blockchain, so you get the whole Stellar
            ecosystem through a single API.
          </p>
        </div>

        <div className="mx-auto mt-14 grid w-full max-w-screen-lg grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ title, description, icon: Icon, iconClass, borderClass }, index) => (
            <div
              key={title}
              style={{
                animationDelay: `${index * 80}ms`,
                animationFillMode: "both",
              }}
              className={cn(
                "group animate-slide-up-fade rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-300 [--offset:12px] hover:-translate-y-1 hover:shadow-lg hover:shadow-neutral-900/5",
                borderClass,
              )}
            >
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110",
                  iconClass,
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 text-base font-medium text-neutral-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="mt-24 px-4">
        <div className="mx-auto grid w-full max-w-screen-lg grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-3 lg:grid-cols-6">
          {STATS.map(({ value, label }) => (
            <div
              key={label}
              className="group flex flex-col items-center justify-center bg-white px-4 py-8 text-center transition-colors hover:bg-neutral-50"
            >
              <span className="font-display text-3xl font-medium tracking-tight text-neutral-900 transition-transform duration-300 group-hover:scale-105 sm:text-4xl">
                {value}
              </span>
              <span className="mt-1.5 text-xs text-neutral-500">{label}</span>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-lg text-balance text-center text-xs text-neutral-400">
          Ecosystem figures reflect the Stellar network and its Anchor Platform,
          not Payoes usage.
        </p>
      </section>

      {/* Wallets */}
      <section className="mt-24">
        <div className="mx-auto w-full max-w-xl px-4 text-center">
          <h2 className="font-display text-balance text-3xl font-medium text-neutral-900 sm:text-4xl">
            Works with the wallets they already have
          </h2>
          <p className="mt-3 text-lg text-neutral-500">
            Checkout connects any Stellar wallet through the Stellar Wallets Kit.
            No customer account, no new app to install.
          </p>
        </div>

        <div className="mx-auto mt-14 grid w-full max-w-screen-lg grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {WALLETS.map(({ name, note }) => (
            <div
              key={name}
              className="group flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-900/5"
            >
              <div className="flex size-10 flex-none items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 font-display text-lg font-bold text-neutral-900 transition-transform duration-300 group-hover:scale-110">
                {name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-medium text-neutral-900">{name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                  {note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <DarkCta
        id="ecosystem-cta"
        badge="Ecosystem"
        accentClassName={ACCENT}
        title="Tap into the Stellar ecosystem"
        description="Free sandbox on Stellar Testnet. Accept any asset, from any wallet, in minutes."
      />
    </>
  );
}
