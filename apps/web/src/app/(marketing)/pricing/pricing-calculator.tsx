"use client";

import NumberFlow from "@number-flow/react";
import { Check } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "../button-link";

const MIN = 10;
const MAX = 50_000;
const STEP = 10;
const RATE = 0.01;


const currency = {
  style: "currency" as const,
  currency: "USD",
  maximumFractionDigits: 0,
};

export function PricingCalculator() {
  const [amount, setAmount] = useState(1_000);

  const fee = amount * RATE;
  const kept = amount - fee;
  const percent = ((amount - MIN) / (MAX - MIN)) * 100;
  const atMax = amount >= MAX;

  return (
    <div className="relative mx-auto w-full max-w-screen-lg">
      {/* Soft accent glow behind the card. */}
      <div className="absolute -inset-x-16 -bottom-8 -top-16 -z-10 opacity-[0.07] blur-[110px] [transform:translate3d(0,0,0)]">
        <div className="size-full bg-[conic-gradient(from_-66deg,#855AFC_-32deg,#f00_63deg,#EAB308_158deg,#5CFF80_240deg,#855AFC_328deg,#f00_423deg)] [mask-image:radial-gradient(closest-side,black_100%,transparent_100%)]" />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-500">Pay as you go</p>
          <span className="flex h-7 items-center rounded-full border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800">
            1% per transaction
          </span>
        </div>

        {/* Estimated fee figure */}
        <div className="mt-6">
          <p className="text-sm font-medium text-neutral-500">
            Your fee per transaction
          </p>
          <div className="mt-1 font-display text-6xl font-medium tracking-tight text-neutral-900 sm:text-7xl">
            <NumberFlow value={fee} format={currency} />
          </div>
          <p className="mt-3 text-pretty text-sm text-neutral-500">
            On a{" "}
            <span className="font-medium text-neutral-900">
              <NumberFlow value={amount} format={currency} />
              {atMax ? "+" : ""}
            </span>{" "}
            payment, you keep{" "}
            <span className="font-medium text-neutral-900">
              <NumberFlow value={kept} format={currency} />
            </span>
            .
          </p>
        </div>

        {/* Volume slider */}
        <div className="mt-8">
          <div className="relative h-2 w-full rounded-full bg-neutral-200">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-neutral-900"
              style={{ width: `${percent}%` }}
            />
            <div
              className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200 bg-white shadow"
              style={{ left: `${percent}%` }}
            />
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={STEP}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              aria-label="Payment amount"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
            <span>$10</span>
            <span>$50k+</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 xs:flex-row">
          <ButtonLink
            variant="primary"
            href="/register"
            className="w-full justify-center xs:w-auto"
          >
            Start for free
          </ButtonLink>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-neutral-500">
        The same 1% rate applies across every product and every Stellar asset.
      </p>
    </div>
  );
}
