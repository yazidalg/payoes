"use client";

import {
  Clock,
  Copy,
  Download,
  Fingerprint,
  Globe,
  HelpCircle,
  KeyRound,
  MapPin,
  MousePointerClick,
  Sparkles,
} from "lucide-react";
import { CSSProperties, useState } from "react";
import { cn } from "@/lib/utils";

/* Small toggle mirroring the reference's Switch (orange track when on). */
function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
        checked ? "bg-orange-600" : "bg-neutral-200",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

/* ----------------------------- Payment links ---------------------------- */

const LINKS = [
  { domain: "pay.acme.co/pro", volume: "$15.6K", primary: true },
  { domain: "acme.li/checkout", volume: "$3.7K" },
  { domain: "acme.me/donate", volume: "$2.4K" },
];

export function PaymentLinksGraphic() {
  return (
    <div className="flex size-full flex-col justify-center" aria-hidden>
      <div className="flex flex-col gap-2.5 [mask-image:linear-gradient(90deg,black_70%,transparent)]">
        {LINKS.map(({ domain, volume, primary }, idx) => (
          <div
            key={domain}
            className="transition-transform duration-300 hover:translate-x-[-2%]"
          >
            <div
              className="ml-[calc((var(--idx)+1)*5%)] flex cursor-default items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              style={{ "--idx": idx } as CSSProperties}
            >
              <div className="flex-none rounded-full border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2">
                <Globe className="size-6 text-neutral-500" strokeWidth={1.75} />
              </div>

              <span className="text-base font-medium text-neutral-900">
                {domain}
              </span>

              <div className="ml-2 flex items-center gap-x-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-[0.2rem]">
                <MousePointerClick className="h-4 w-4 text-neutral-700" />
                <div className="flex items-center whitespace-nowrap text-sm text-neutral-500">
                  {volume}
                  <span className="ml-1 hidden sm:inline-block">paid</span>
                </div>
              </div>

              {primary && (
                <div className="flex items-center gap-x-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-[0.2rem]">
                  <Sparkles className="h-4 w-4 text-blue-700" />
                  <div className="flex items-center whitespace-nowrap text-sm text-blue-600">
                    Primary
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- QR code ------------------------------- */

export function QRGraphic() {
  const [hideLogo, setHideLogo] = useState(false);

  return (
    <div className="size-full [mask-image:linear-gradient(black_70%,transparent)]">
      <div
        className="mx-3.5 flex origin-top scale-95 cursor-default flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_20px_20px_0_#00000017]"
        aria-hidden
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">QR Code Design</h3>
          <div className="max-md:hidden">
            <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
              Q
            </kbd>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">
                QR Code Preview
              </span>
              <HelpCircle className="size-4 text-neutral-500" />
            </div>
            <div className="flex h-6 items-center gap-3 px-1">
              <Download className="size-4 text-neutral-500" />
              <Copy className="size-4 text-neutral-500" />
            </div>
          </div>
          <div className="relative mt-2 flex h-40 items-center justify-center overflow-hidden rounded-md border border-neutral-300">
            <div className="relative flex size-full items-center justify-center">
              <QRCode hideLogo={hideLogo} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-700">Logo</span>
            <HelpCircle className="size-4 text-neutral-500" />
          </div>
          <Switch checked={!hideLogo} onChange={(checked) => setHideLogo(!checked)} />
        </div>
      </div>
    </div>
  );
}

function QRCode({ hideLogo }: { hideLogo: boolean }) {
  return (
    <svg width="128" height="128" viewBox="0 0 29 29">
      <path fill="#fff" d="M0 0h29v29H0z" shapeRendering="crispEdges" />
      <path
        d="M2 2h7v1H2zM10 2h1v1H10zM12 2h2v1H12zM17 2h1v1H17zM20,2 h7v1H20zM2 3h1v1H2zM8 3h1v1H8zM11 3h1v1H11zM13 3h3v1H13zM17 3h1v1H17zM20 3h1v1H20zM26,3 h1v1H26zM2 4h1v1H2zM4 4h3v1H4zM8 4h1v1H8zM10 4h2v1H10zM18 4h1v1H18zM20 4h1v1H20zM22 4h3v1H22zM26,4 h1v1H26zM2 5h1v1H2zM4 5h3v1H4zM8 5h1v1H8zM10 5h1v1H10zM13 5h2v1H13zM17 5h2v1H17zM20 5h1v1H20zM22 5h3v1H22zM26,5 h1v1H26zM2 6h1v1H2zM4 6h3v1H4zM8 6h1v1H8zM12 6h2v1H12zM17 6h2v1H17zM20 6h1v1H20zM22 6h3v1H22zM26,6 h1v1H26zM2 7h1v1H2zM8 7h1v1H8zM10 7h4v1H10zM15 7h1v1H15zM17 7h2v1H17zM20 7h1v1H20zM26,7 h1v1H26zM2 8h7v1H2zM10 8h1v1H10zM12 8h1v1H12zM14 8h1v1H14zM16 8h1v1H16zM18 8h1v1H18zM20,8 h7v1H20zM10 9h1v1H10zM12 9h1v1H12zM14 9h1v1H14zM16 9h1v1H16zM3 10h1v1H3zM5 10h1v1H5zM7 10h5v1H7zM13 10h3v1H13zM17 10h1v1H17zM19 10h3v1H19zM23 10h2v1H23zM26,10 h1v1H26zM3 11h4v1H3zM10 11h1v1H10zM12 11h1v1H12zM15 11h2v1H15zM19 11h3v1H19zM26,11 h1v1H26zM2 12h1v1H2zM7 12h2v1H7zM11 12h2v1H11zM14 12h3v1H14zM19 12h1v1H19zM21 12h2v1H21zM25,12 h2v1H25zM2 13h3v1H2zM6 13h1v1H6zM13 13h1v1H13zM15 13h1v1H15zM20 13h1v1H20zM22 13h1v1H22zM3 14h1v1H3zM6 14h4v1H6zM13 14h2v1H13zM16 14h1v1H16zM19 14h2v1H19zM23 14h1v1H23zM25,14 h2v1H25zM11 15h1v1H11zM14 15h2v1H14zM20 15h2v1H20zM23 15h2v1H23zM26,15 h1v1H26zM2 16h1v1H2zM4 16h1v1H4zM7 16h2v1H7zM10 16h1v1H10zM16 16h1v1H16zM20 16h3v1H20zM24 16h1v1H24zM26,16 h1v1H26zM3 17h1v1H3zM6 17h1v1H6zM10 17h1v1H10zM12 17h1v1H12zM15 17h3v1H15zM19 17h1v1H19zM22 17h1v1H22zM25 17h1v1H25zM2 18h2v1H2zM8 18h2v1H8zM11 18h1v1H11zM13 18h2v1H13zM18 18h7v1H18zM10 19h1v1H10zM14 19h1v1H14zM16 19h1v1H16zM18 19h1v1H18zM22 19h2v1H22zM26,19 h1v1H26zM2 20h7v1H2zM10 20h5v1H10zM16 20h3v1H16zM20 20h1v1H20zM22 20h2v1H22zM25,20 h2v1H25zM2 21h1v1H2zM8 21h1v1H8zM10 21h1v1H10zM15 21h2v1H15zM18 21h1v1H18zM22 21h4v1H22zM2 22h1v1H2zM4 22h3v1H4zM8 22h1v1H8zM11 22h1v1H11zM14 22h1v1H14zM18 22h6v1H18zM26,22 h1v1H26zM2 23h1v1H2zM4 23h3v1H4zM8 23h1v1H8zM10 23h2v1H10zM14 23h2v1H14zM18 23h1v1H18zM21 23h4v1H21zM2 24h1v1H2zM4 24h3v1H4zM8 24h1v1H8zM11 24h2v1H11zM14 24h1v1H14zM16 24h3v1H16zM21 24h2v1H21zM24 24h1v1H24zM26,24 h1v1H26zM2 25h1v1H2zM8 25h1v1H8zM10 25h1v1H10zM12 25h1v1H12zM14 25h2v1H14zM17 25h4v1H17zM23 25h1v1H23zM2 26h7v1H2zM12 26h4v1H12zM18 26h2v1H18zM21 26h1v1H21zM25,26 h2v1H25z"
        shapeRendering="crispEdges"
      />
      <rect
        width="7.35"
        height="7.2"
        x="10.9"
        y="10.9"
        fill="#fff"
        className={cn("transition-opacity", hideLogo && "opacity-0")}
      />
      <g className={cn("transition-opacity", hideLogo && "opacity-0")}>
        <rect
          width="6.25"
          height="6.25"
          x="11.375"
          y="11.375"
          rx="1.4"
          fill="#171717"
        />
        <text
          x="14.5"
          y="15.6"
          textAnchor="middle"
          fontSize="4.4"
          fontWeight="700"
          fontFamily="var(--font-satoshi), sans-serif"
          fill="#fff"
        >
          P
        </text>
      </g>
    </svg>
  );
}

/* --------------------------- Payment features --------------------------- */

const OPTIONS = [
  { label: "Custom branding", icon: Sparkles, checked: true },
  { label: "Metadata", icon: Fingerprint, checked: true },
  { label: "Expiration", icon: Clock, checked: false },
  { label: "Geo targeting", icon: MapPin, checked: true },
  { label: "Password", icon: KeyRound, checked: true },
];

export function PaymentFeaturesGraphic() {
  return (
    <div
      className="size-full overflow-clip [mask-image:linear-gradient(black_70%,transparent)]"
      aria-hidden
    >
      <div className="mx-3.5 flex cursor-default flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_20px_20px_0_#00000017]">
        <h3 className="text-base font-medium">Checkout customization</h3>

        <div className="flex flex-col gap-2.5">
          {OPTIONS.map(({ label, icon: Icon, checked }) => (
            <DummyRow key={label} label={label} Icon={Icon} checked={checked} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DummyRow({
  label,
  Icon,
  checked,
}: {
  label: string;
  Icon: typeof Sparkles;
  checked: boolean;
}) {
  const [isChecked, setIsChecked] = useState(checked);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 p-2.5">
      <div className="flex items-center gap-2 text-neutral-800">
        <Icon className="size-5" strokeWidth={1.75} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Switch checked={isChecked} onChange={setIsChecked} />
    </div>
  );
}

/* ---------------------------- Team / SAML SSO --------------------------- */

export function CollaborationGraphic() {
  return (
    <div
      className="size-full pt-5 [mask-image:linear-gradient(black_50%,transparent)]"
      aria-hidden
    >
      <div className="relative size-full rounded-t-2xl border-x-2 border-t-2 border-orange-600 bg-white/70">
        <div className="absolute -top-px left-1/2 flex h-7 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_4px_#EA590D80]">
          <BadgeCap />
          <div className="-mx-px flex h-full items-center bg-orange-600 px-2 font-mono text-sm tracking-wide text-white">
            SAML SSO
          </div>
          <BadgeCap className="-scale-x-100" />
        </div>
        <div className="grid grid-cols-6 gap-4 p-8">
          {Array.from({ length: 36 }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-lg transition-transform hover:scale-110 sm:rounded-xl"
              style={{
                backgroundImage: `linear-gradient(135deg, hsl(${(idx * 47) % 360} 65% 78%), hsl(${(idx * 47 + 40) % 360} 60% 62%))`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BadgeCap({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="31"
      height="30"
      fill="none"
      viewBox="0 0 28 30"
      className={cn("h-full text-orange-600", className)}
    >
      <path
        fill="currentColor"
        d="M25.658.14h5.337v29.572h-5.337a9.24 9.24 0 0 1-6.626-2.8l-4.327-4.45A26.2 26.2 0 0 0 .5 14.926a26.2 26.2 0 0 0 14.205-7.535l4.327-4.451a9.24 9.24 0 0 1 6.626-2.8"
      />
    </svg>
  );
}

/* ---------------------------- Payment analytics ------------------------- */

const BARS = [38, 52, 44, 66, 58, 74, 62, 88, 79, 96, 84, 100];

export function AnalyticsGraphic() {
  return (
    <div
      aria-hidden
      className="size-full select-none [mask-image:linear-gradient(black_60%,transparent)]"
    >
      <div className="relative mx-3.5 h-full overflow-hidden rounded-t-xl border-x border-t border-neutral-200 bg-white shadow-[0_20px_20px_0_#00000017]">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              Total volume
            </p>
            <p className="font-display text-2xl font-medium text-neutral-900">
              $48,214.90
            </p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: "Payments", value: "7.2K" },
              { label: "Customers", value: "1.9K" },
              { label: "Success", value: "98.4%" },
            ].map(({ label, value }) => (
              <div key={label} className="text-right">
                <p className="text-xs text-neutral-500">{label}</p>
                <p className="text-sm font-medium text-neutral-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative h-64 px-6 pb-6 pt-8">
          <div className="flex h-full items-end justify-between gap-2 sm:gap-3">
            {BARS.map((h, idx) => (
              <div
                key={idx}
                className="flex-1 rounded-t-md bg-gradient-to-t from-violet-500/70 to-blue-500"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-6 bottom-6 top-8 flex flex-col justify-between">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-px w-full bg-neutral-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
