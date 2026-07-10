"use client";

import { KYC_VERIFICATION_STEPS } from "@/constants/kyc/steps";
import { Button, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useKycSidebar } from "./kyc-sidebar-context";

function isStepComplete(
  step: (typeof KYC_VERIFICATION_STEPS)[number]["step"],
  identityComplete: boolean,
  goLiveComplete: boolean,
  walletComplete: boolean,
) {
  switch (step) {
    case "identity":
      return identityComplete;
    case "go-live":
      return goLiveComplete;
    case "settlement-wallet":
      return walletComplete;
    default:
      return false;
  }
}

function isStepDisabled(
  step: (typeof KYC_VERIFICATION_STEPS)[number]["step"],
  identityComplete: boolean,
  goLiveComplete: boolean,
) {
  if (step === "go-live") {
    return !identityComplete;
  }

  if (step === "settlement-wallet") {
    return !goLiveComplete;
  }

  return false;
}

export function KycVerificationSteps({
  identityComplete,
  goLiveComplete,
  walletComplete,
}: {
  identityComplete: boolean;
  goLiveComplete: boolean;
  walletComplete: boolean;
}) {
  const pathname = usePathname();
  const { isDesktop } = useMediaQuery();
  const { isOpen, setIsOpen } = useKycSidebar();

  useEffect(() => {
    document.body.style.overflow = isOpen && !isDesktop ? "hidden" : "auto";
  }, [isOpen, isDesktop]);

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-20 h-screen w-screen transition-[background-color,backdrop-filter] lg:static lg:z-0 lg:h-auto lg:w-full lg:bg-transparent",
        isOpen
          ? "bg-black/20 backdrop-blur-sm"
          : "bg-transparent max-lg:pointer-events-none",
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setIsOpen(false);
        }
      }}
    >
      <div
        className={cn(
          "relative h-full w-[240px] max-w-full bg-white transition-transform lg:translate-x-0",
          !isOpen && "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-neutral-200 p-4 lg:border-b-0">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <h2 className="text-sm font-medium text-neutral-900">Steps</h2>
            <Button
              type="button"
              variant="outline"
              className="size-8 p-0"
              onClick={() => setIsOpen(false)}
              icon={<X className="size-4 text-neutral-600" />}
            />
          </div>
          <nav className="space-y-1">
            {KYC_VERIFICATION_STEPS.map(({ step, label, href, stepNumber }) => {
              const current = pathname.startsWith(href);
              const completed = isStepComplete(
                step,
                identityComplete,
                goLiveComplete,
                walletComplete,
              );
              const isDisabled = isStepDisabled(
                step,
                identityComplete,
                goLiveComplete,
              );

              if (isDisabled) {
                return (
                  <div
                    key={step}
                    className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 opacity-60"
                  >
                    <div className="flex size-5 items-center justify-center rounded-full bg-neutral-200 text-xs text-neutral-500">
                      {stepNumber}
                    </div>
                    <span className="text-sm font-medium text-neutral-400">
                      {label}
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={step}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 hover:bg-neutral-100",
                    current && "bg-blue-50",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-xs",
                      completed && !current && "bg-black text-white",
                      current && "bg-blue-500 text-white",
                      !current &&
                        !completed &&
                        "border border-neutral-200 text-neutral-500",
                    )}
                  >
                    {completed && !current ? (
                      <Check className="size-3" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      current && "text-blue-500",
                      !current && !completed && "text-neutral-600",
                      completed && !current && "text-neutral-900",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
