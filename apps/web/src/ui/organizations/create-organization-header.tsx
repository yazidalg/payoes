"use client";

import { Wordmark } from "@dub/ui";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useKycSidebar } from "@/ui/kyc/kyc-sidebar-context";

export function CreateOrganizationHeader() {
  const { isOpen, setIsOpen } = useKycSidebar();

  return (
    <div className="border-b border-neutral-200 px-4 pb-4 pt-0 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden rounded-md p-1 hover:bg-neutral-100"
          aria-label="Open organization steps"
        >
          <Menu className="size-5 text-neutral-600" />
        </button>
        <Link href="/dashboard/payments" className="flex items-center">
          <Wordmark className="h-7" />
        </Link>
        <h1 className="text-base font-semibold text-neutral-700">
          Create organization
        </h1>
      </div>
    </div>
  );
}
