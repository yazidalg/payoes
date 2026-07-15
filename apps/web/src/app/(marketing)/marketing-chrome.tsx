"use client";

import { Nav, NavMobile } from "@dub/ui";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Footer } from "./footer";
import { payoesNavItems } from "./payoes-nav";

function PayoesLogoLink() {
  return (
    <Link
      href="/"
      className="block w-fit rounded-lg py-2 pr-2 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <Logo className="h-10 w-auto" />
    </Link>
  );
}

export function MarketingChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavMobile staticDomain="dub.co" navItems={payoesNavItems} />
      <Nav
        staticDomain="dub.co"
        navItems={payoesNavItems}
        maxWidthWrapperClassName="max-w-screen-lg lg:px-4 xl:px-0"
        logo={<PayoesLogoLink />}
      />
      {children}
      <Footer />
    </>
  );
}
