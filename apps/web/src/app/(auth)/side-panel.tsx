import { cn } from "@dub/utils";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function SidePanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden border-l border-black/5 bg-neutral-50 min-[900px]:flex">
      {[...Array(2)].map((_, idx) => (
        <div
          key={idx}
          className={cn(
            "absolute bottom-0 left-1/2 size-[80px] -translate-x-1/2 translate-y-1/2 scale-x-[1.6]",
            idx === 0 ? "mix-blend-overlay" : "opacity-15",
          )}
        >
          {[...Array(idx === 0 ? 2 : 1)].map((_, innerIdx) => (
            <div
              key={innerIdx}
              className={cn(
                "absolute -inset-16 mix-blend-overlay blur-[50px] saturate-[2]",
                "bg-[conic-gradient(from_90deg,#F00_5deg,#EAB308_63deg,#5CFF80_115deg,#1E00FF_170deg,#855AFC_220deg,#3A8BFD_286deg,#F00_360deg)]",
              )}
            />
          ))}
        </div>
      ))}

      <div className="relative flex grow items-center justify-center p-8 lg:p-14">
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-xl border border-neutral-900/10 bg-gradient-to-br from-neutral-900 to-neutral-700 p-8">
            <div className="flex items-center gap-3">
              <Logo className="size-12 brightness-0 invert" />
              <span className="text-xl font-semibold text-white">Payoes</span>
            </div>
            <p className="mt-6 text-pretty text-lg font-medium text-neutral-200">
              Stellar payment infrastructure for modern apps. Accept, send, and
              manage digital assets from one platform.
            </p>
          </div>

          <p className="text-content-default max-w-[370px] text-pretty text-xl font-medium">
            Build payment flows on Stellar with wallets, organizations, and
            real-time settlement.
          </p>

          <Link
            href="/"
            className="text-content-emphasis flex h-8 w-fit items-center rounded-lg bg-black/5 px-3 text-sm font-medium transition-[transform,background-color] duration-75 hover:bg-black/10 active:scale-[0.98]"
          >
            Learn more
          </Link>
        </div>
      </div>

      <div className="relative border-t border-black/5 px-8 py-6">
        <p className="text-content-subtle text-sm">
          Trusted by teams building on Stellar
        </p>
      </div>
    </div>
  );
}
