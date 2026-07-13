import { EnvironmentBanner } from "@/ui/layout/environment-banner";
import { MainNav } from "@/ui/layout/main-nav";
import { DashboardPageContent } from "@/ui/layout/dashboard-page-content";
import { PayoesSidebarNav } from "@/ui/layout/sidebar/payoes-sidebar-nav";
import { UpgradeBanner } from "@/ui/layout/upgrade-banner";

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-white">
      <EnvironmentBanner />
      <UpgradeBanner />
      <MainNav sidebar={PayoesSidebarNav}>
        <DashboardPageContent>{children}</DashboardPageContent>
      </MainNav>
    </div>
  );
}
