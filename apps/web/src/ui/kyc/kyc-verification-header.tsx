"use client";

import { Wordmark, useMediaQuery } from "@dub/ui";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useKycSidebar } from "./kyc-sidebar-context";

export function KycVerificationHeader() {
  const { isDesktop } = useMediaQuery();
  const { isOpen, setIsOpen } = useKycSidebar();

  return (
    <div className="border-b border-neutral-200 px-4 pb-4 pt-0 lg:px-6">
      <div className="flex items-center gap-4">
        {!isDesktop ? (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-md p-1 hover:bg-neutral-100"
            aria-label="Open verification steps"
          >
            <Menu className="size-5 text-neutral-600" />
          </button>
        ) : null}
        <Link href="/dashboard/payments" className="flex items-center">
          <Wordmark className="h-7" />
        </Link>
        <h1 className="text-base font-semibold text-neutral-700">
          Enable production
        </h1>
      </div>
    </div>
  );
}
