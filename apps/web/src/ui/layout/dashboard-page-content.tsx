"use client";

import { getDashboardPageTitle } from "@/lib/navigation/dashboard-nav";
import { usePathname } from "next/navigation";
import {
  DashboardPageHeaderProvider,
  useDashboardPageHeaderOverride,
} from "./dashboard-page-header-context";
import { PageContent } from "./page-content";
import { PageWidthWrapper } from "./page-width-wrapper";

function DashboardPageContentInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const override = useDashboardPageHeaderOverride();
  const pageTitle = override?.title ?? getDashboardPageTitle(pathname);

  return (
    <PageContent
      title={pageTitle}
      titleInfo={override?.titleInfo}
      controls={override?.controls}
      headerContent={override?.headerContent}
      contentWrapperClassName="pb-6"
    >
      <PageWidthWrapper>{children}</PageWidthWrapper>
    </PageContent>
  );
}

export function DashboardPageContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardPageHeaderProvider>
      <DashboardPageContentInner>{children}</DashboardPageContentInner>
    </DashboardPageHeaderProvider>
  );
}
