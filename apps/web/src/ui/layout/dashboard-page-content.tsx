"use client";

import { getDashboardPageTitle } from "@/lib/navigation/dashboard-nav";
import { usePathname } from "next/navigation";
import { PageContent } from "./page-content";
import { PageWidthWrapper } from "./page-width-wrapper";

export function DashboardPageContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = getDashboardPageTitle(pathname);

  return (
    <PageContent title={pageTitle} contentWrapperClassName="pb-6">
      <PageWidthWrapper>{children}</PageWidthWrapper>
    </PageContent>
  );
}
