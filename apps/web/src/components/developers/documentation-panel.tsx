"use client";

import { useMemo } from "react";
import { getDocsQuickstartUrl, getDocsUrl } from "@/lib/docs/url";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import { ArrowUpRight, Book2, Bolt } from "@dub/ui/icons";

export function DocumentationPanel() {
  const docsUrl = getDocsUrl();
  const quickstartUrl = getDocsQuickstartUrl();

  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title: "API reference, guides, and integration examples for Payoes.",
      },
    }),
    [],
  );

  useSetDashboardPageHeader(headerOverride);

  const links = [
    {
      icon: Book2,
      title: "Developer docs",
      description: "Hosted on Mintlify with guides, OpenAPI reference, and copy-paste examples.",
      href: docsUrl,
      cta: "Open",
    },
    {
      icon: Bolt,
      title: "Quickstart",
      description: "Create your first payment with the REST API and complete checkout on Stellar testnet.",
      href: quickstartUrl,
      cta: "View",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="divide-border-subtle border-border-subtle flex max-w-xl flex-col divide-y rounded-lg border">
        {links.map(({ icon: Icon, title, description, href, cta }) => (
          <div key={title} className="flex items-center justify-between gap-4 px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-black/5">
                <Icon variant="fill" className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-content-default text-sm font-medium">{title}</div>
                <p className="text-content-subtle text-xs font-medium">{description}</p>
              </div>
            </div>

            <a href={href} target="_blank" rel="noopener noreferrer" className="border-subtle bg-bg-default hover:bg-bg-muted flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-sm font-medium transition-transform active:scale-[0.98]">
              {cta}
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
