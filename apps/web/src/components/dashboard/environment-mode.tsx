"use client";

import type { Organization } from "@/lib/db/schema";
import { InfoIcon } from "lucide-react";

import "./sandbox-banner.css";

export function SandboxModeBanner({
  organization,
}: {
  organization: Organization;
}) {
  if (organization.environment === "production") {
    return null;
  }

  return (
    <div className="payoes-sandbox-banner relative z-50 flex w-full shrink-0 items-center px-4 py-3 sm:px-6">
      <div className="flex w-full items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <InfoIcon className="size-4 shrink-0" aria-hidden />
          <p className="text-sm font-medium leading-snug sm:text-[15px]">
            You&apos;re testing in a sandbox. Changes you make here don&apos;t
            affect your live account.
          </p>
        </div>

        <button
          type="button"
          disabled
          className="payoes-sandbox-banner__button shrink-0 rounded-md px-3 py-1.5 text-xs font-medium shadow-sm sm:text-sm"
        >
          Switch to Production mode
        </button>
      </div>
    </div>
  );
}
